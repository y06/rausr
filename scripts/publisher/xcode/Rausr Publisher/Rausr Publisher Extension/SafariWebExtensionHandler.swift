import Foundation
import SafariServices
import os.log

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private let defaultsKey = "RausrPublisherConfiguration"
    private let defaultProjectPath = "/Users/sendit/Documents/Work-private/rausr.com/web-git"

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let message: Any?

        if #available(macOS 11.0, *) {
            message = request?.userInfo?[SFExtensionMessageKey]
        } else {
            message = request?.userInfo?["message"]
        }

        guard let payload = message as? [String: Any], let action = payload["action"] as? String else {
            finish(context, ["ok": false, "error": "The native companion received an invalid request."])
            return
        }

        os_log(.default, "Rausr Publisher action: %{public}@", action)
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            self.finish(context, self.handle(action: action, payload: payload))
        }
    }

    private func handle(action: String, payload: [String: Any]) -> [String: Any] {
        switch action {
        case "status":
            return ["ok": true, "companionAvailable": true]

        case "bootstrap":
            var configuration = savedConfiguration()
            if blank(configuration["projectPath"]) && isHugoProject(defaultProjectPath) {
                configuration["projectPath"] = defaultProjectPath
                saveConfiguration(configuration)
            }
            let projectPath = string(configuration["projectPath"])
            return [
                "ok": true,
                "companionAvailable": true,
                "configuration": configuration,
                "articles": articles(in: projectPath),
                "hugoVersion": hugoVersion(),
                "activity": activity(projectPath: projectPath)
            ]

        case "chooseProject":
            let requested = string(payload["projectPath"])
            let configured = requested.isEmpty ? string(savedConfiguration()["projectPath"]) : requested
            let projectPath = isHugoProject(configured) ? configured : defaultProjectPath
            guard isHugoProject(projectPath) else {
                return ["ok": false, "error": "The configured folder is not a Hugo project. Enter its absolute path in Settings."]
            }
            var configuration = savedConfiguration()
            configuration["projectPath"] = projectPath
            saveConfiguration(configuration)
            return [
                "ok": true,
                "projectPath": projectPath,
                "hugoVersion": hugoVersion(),
                "articles": articles(in: projectPath),
                "activity": activity(projectPath: projectPath)
            ]

        case "saveConfiguration":
            guard let incoming = payload["configuration"] as? [String: Any] else {
                return ["ok": false, "error": "No configuration was supplied."]
            }
            var configuration = savedConfiguration()
            incoming.forEach { configuration[$0.key] = $0.value }
            saveConfiguration(configuration)
            return ["ok": true, "configuration": configuration]

        case "listArticles":
            let requestedPath = string(payload["projectPath"])
            let projectPath = requestedPath.isEmpty ? string(savedConfiguration()["projectPath"]) : requestedPath
            guard isHugoProject(projectPath) else {
                return ["ok": false, "error": "Choose a valid Hugo project first."]
            }
            return [
                "ok": true,
                "articles": articles(in: projectPath),
                "activity": activity(projectPath: projectPath)
            ]

        case "authorizeGoogle":
            if let incoming = payload["configuration"] as? [String: Any] {
                var configuration = savedConfiguration()
                incoming.forEach { configuration[$0.key] = $0.value }
                saveConfiguration(configuration)
            }
            if let clientJSON = payload["oauthClientJSON"] as? String, !clientJSON.isEmpty {
                let saved = saveOAuthClientJSON(clientJSON)
                guard saved.ok else { return ["ok": false, "error": saved.error] }
            }
            return authorizeGoogle()

        case "connectMedium":
            if let token = payload["token"] as? String, !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let saved = saveMediumToken(token)
                guard saved.ok else { return ["ok": false, "error": saved.error] }
            }
            return connectMedium()

        case "recordMediumImport":
            return recordMediumImport(
                articleID: string(payload["articleId"]),
                status: string(payload["status"]),
                url: string(payload["url"])
            )

        case "recordLinkedInPost":
            return recordLinkedInPost(
                articleID: string(payload["articleId"]),
                status: string(payload["status"]),
                url: string(payload["url"])
            )

        case "connectFacebook":
            var configuration = savedConfiguration()
            let pageID = string(payload["pageId"])
            let pageURL = string(payload["pageURL"])
            if !pageID.isEmpty { configuration["facebookPageId"] = pageID }
            if let normalized = facebookPageURL(pageURL) { configuration["facebookPageURL"] = normalized }
            saveConfiguration(configuration)
            if let token = payload["token"] as? String, !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let saved = saveFacebookToken(token)
                guard saved.ok else { return ["ok": false, "error": saved.error] }
            }
            return connectFacebook()

        case "recordFacebookPost":
            return recordFacebookPost(
                articleID: string(payload["articleId"]),
                status: string(payload["status"]),
                url: string(payload["url"])
            )

        case "publish":
            let ids = payload["articleIds"] as? [String] ?? []
            let mode = string(payload["mode"])
            let provider = string(payload["provider"], fallback: string(savedConfiguration()["activeProvider"], fallback: "blogger"))
            return publish(articleIds: ids, mode: mode, provider: provider)

        default:
            return ["ok": false, "error": "Unknown companion action: \(action)"]
        }
    }

    private func savedConfiguration() -> [String: Any] {
        var configuration: [String: Any] = [
            "projectPath": defaultProjectPath,
            "oauthClientPath": "",
            "blogId": "",
            "blogName": "",
            "activeProvider": "blogger",
            "mediumTokenPath": "",
            "mediumPublishingMode": "import",
            "mediumUserName": "",
            "mediumTargetType": "user",
            "mediumTargetId": "",
            "mediumTargetName": "",
            "linkedinCompanyURL": "https://www.linkedin.com/company/rausr/",
            "facebookPublishingMode": "assisted",
            "facebookPageURL": "https://www.facebook.com/rausrdotcom/",
            "facebookPageId": "",
            "facebookPageName": "Rausr",
            "facebookTokenPath": "",
            "facebookGraphVersion": "v26.0",
            "timezone": "Europe/Bratislava",
            "publishTime": "09:00",
            "includeHeaderImage": true,
            "confirmBeforePublish": true
        ]
        UserDefaults.standard.dictionary(forKey: defaultsKey)?.forEach { configuration[$0.key] = $0.value }
        return configuration
    }

    private func saveConfiguration(_ configuration: [String: Any]) {
        UserDefaults.standard.set(configuration, forKey: defaultsKey)
    }

    private func authorizeGoogle() -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        let clientSecret = string(configuration["oauthClientPath"])

        guard isHugoProject(projectPath) else {
            return ["ok": false, "error": "Choose a valid Hugo project first."]
        }
        guard !clientSecret.isEmpty, FileManager.default.fileExists(atPath: clientSecret) else {
            return ["ok": false, "error": "Choose the OAuth desktop client JSON file first."]
        }

        let result = runPublisher(
            projectPath: projectPath,
            scriptRelativePath: "scripts/blogger/publish_hugo_to_blogger.py",
            arguments: ["--list-blogs", "--client-secret", clientSecret]
        )
        guard result.status == 0 else {
            return ["ok": false, "error": publisherError(result)]
        }

        let blogs: [[String: String]] = result.output.split(separator: "\n").compactMap { line in
            let fields = line.split(separator: "\t", omittingEmptySubsequences: false).map(String.init)
            guard fields.count >= 2, !fields[0].isEmpty else { return nil }
            return ["id": fields[0], "name": fields[1], "url": fields.count > 2 ? fields[2] : ""]
        }
        guard !blogs.isEmpty else {
            return ["ok": false, "error": "Google connected, but no Blogger blogs are available for this account."]
        }
        return ["ok": true, "blogs": blogs, "oauthClientPath": clientSecret]
    }

    private func saveOAuthClientJSON(_ source: String) -> (ok: Bool, error: String) {
        guard let data = source.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              object["installed"] != nil || object["web"] != nil else {
            return (false, "That file is not a valid Google OAuth client JSON file.")
        }
        do {
            let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("Rausr Publisher", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let destination = directory.appendingPathComponent("client_secret.json")
            try data.write(to: destination, options: [.atomic])
            var configuration = savedConfiguration()
            configuration["oauthClientPath"] = destination.path
            saveConfiguration(configuration)
            return (true, "")
        } catch {
            return (false, "Could not save the OAuth client file: \(error.localizedDescription)")
        }
    }

    private func saveMediumToken(_ source: String) -> (ok: Bool, error: String) {
        let token = source.trimmingCharacters(in: .whitespacesAndNewlines)
        guard token.count >= 16, !token.contains(" ") else {
            return (false, "That does not look like a Medium integration token.")
        }
        do {
            let directory = applicationSupportDirectory().appendingPathComponent("config/hugo-medium", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let destination = directory.appendingPathComponent("token")
            try (token + "\n").write(to: destination, atomically: true, encoding: .utf8)
            try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: destination.path)
            var configuration = savedConfiguration()
            configuration["mediumTokenPath"] = destination.path
            saveConfiguration(configuration)
            return (true, "")
        } catch {
            return (false, "Could not save the Medium token: \(error.localizedDescription)")
        }
    }

    private func connectMedium() -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        let tokenPath = string(configuration["mediumTokenPath"])
        guard isHugoProject(projectPath) else {
            return ["ok": false, "error": "Choose a valid Hugo project first."]
        }
        guard !tokenPath.isEmpty, FileManager.default.fileExists(atPath: tokenPath) else {
            return ["ok": false, "error": "Paste an existing Medium integration token first. Medium no longer issues new tokens."]
        }
        let result = runPublisher(
            projectPath: projectPath,
            scriptRelativePath: "scripts/medium/publish_hugo_to_medium.py",
            arguments: ["--list-targets", "--token-file", tokenPath]
        )
        guard result.status == 0 else { return ["ok": false, "error": publisherError(result)] }
        let targets: [[String: String]] = result.output.split(separator: "\n").compactMap { line in
            let fields = line.split(separator: "\t", omittingEmptySubsequences: false).map(String.init)
            guard fields.count >= 3, ["user", "publication"].contains(fields[0]), !fields[1].isEmpty else { return nil }
            return ["type": fields[0], "id": fields[1], "name": fields[2], "url": fields.count > 3 ? fields[3] : ""]
        }
        guard let profile = targets.first(where: { $0["type"] == "user" }) else {
            return ["ok": false, "error": "Medium connected but returned no profile target."]
        }
        var updated = configuration
        updated["mediumUserName"] = profile["name"] ?? "Medium"
        updated["mediumTokenPath"] = tokenPath
        updated["mediumPublishingMode"] = "api"
        if string(updated["mediumTargetId"]).isEmpty {
            updated["mediumTargetType"] = profile["type"] ?? "user"
            updated["mediumTargetId"] = profile["id"] ?? ""
            updated["mediumTargetName"] = profile["name"] ?? "Medium profile"
        }
        saveConfiguration(updated)
        return ["ok": true, "targets": targets, "configuration": updated]
    }

    private func saveFacebookToken(_ source: String) -> (ok: Bool, error: String) {
        let token = source.trimmingCharacters(in: .whitespacesAndNewlines)
        guard token.count >= 40, !token.contains(" ") else {
            return (false, "That does not look like a Facebook Page access token.")
        }
        do {
            let directory = applicationSupportDirectory().appendingPathComponent("config/hugo-facebook", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let destination = directory.appendingPathComponent("token")
            try (token + "\n").write(to: destination, atomically: true, encoding: .utf8)
            try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: destination.path)
            var configuration = savedConfiguration()
            configuration["facebookTokenPath"] = destination.path
            saveConfiguration(configuration)
            return (true, "")
        } catch {
            return (false, "Could not save the Facebook token: \(error.localizedDescription)")
        }
    }

    private func connectFacebook() -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        let pageID = string(configuration["facebookPageId"])
        let tokenPath = string(configuration["facebookTokenPath"])
        let graphVersion = string(configuration["facebookGraphVersion"], fallback: "v26.0")
        guard isHugoProject(projectPath) else { return ["ok": false, "error": "Choose a valid Hugo project first."] }
        guard !pageID.isEmpty else { return ["ok": false, "error": "Enter the numeric Facebook Page ID first."] }
        guard !tokenPath.isEmpty, FileManager.default.fileExists(atPath: tokenPath) else {
            return ["ok": false, "error": "Paste a Facebook Page access token first."]
        }
        let result = runPublisher(
            projectPath: projectPath,
            scriptRelativePath: "scripts/facebook/publish_hugo_to_facebook.py",
            arguments: ["--page-id", pageID, "--token-file", tokenPath, "--graph-version", graphVersion, "--validate"]
        )
        guard result.status == 0 else { return ["ok": false, "error": publisherError(result)] }
        let fields = result.output.trimmingCharacters(in: .whitespacesAndNewlines)
            .split(separator: "\t", omittingEmptySubsequences: false).map(String.init)
        guard fields.count >= 2, fields[0] == pageID else {
            return ["ok": false, "error": "Meta returned an unexpected Page identity."]
        }
        var updated = configuration
        updated["facebookPageName"] = fields[1]
        updated["facebookPageURL"] = fields.count > 2 && !fields[2].isEmpty ? fields[2] : string(configuration["facebookPageURL"])
        updated["facebookPublishingMode"] = "api"
        saveConfiguration(updated)
        return ["ok": true, "pageName": fields[1], "configuration": updated]
    }

    private func publish(articleIds: [String], mode: String, provider: String) -> [String: Any] {
        switch provider {
        case "medium":
            return publishMedium(articleIds: articleIds, mode: mode)
        case "linkedin":
            return prepareLinkedInPosts(articleIds: articleIds)
        case "facebook":
            return string(savedConfiguration()["facebookPublishingMode"], fallback: "assisted") == "api"
                ? publishFacebook(articleIds: articleIds, mode: mode)
                : prepareFacebookPosts(articleIds: articleIds)
        default:
            return publishBlogger(articleIds: articleIds, mode: mode)
        }
    }

    private func articlePaths(_ articleIds: [String], projectPath: String) -> [String]? {
        let contentRoot = URL(fileURLWithPath: projectPath).appendingPathComponent("content/blog")
        let paths = articleIds.compactMap { id -> String? in
            guard safeIdentifier(id) else { return nil }
            let path = contentRoot.appendingPathComponent(id).appendingPathExtension("md").path
            return FileManager.default.fileExists(atPath: path) ? path : nil
        }
        return paths.count == articleIds.count ? paths : nil
    }

    private func publishBlogger(articleIds: [String], mode: String) -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        let blogID = string(configuration["blogId"])
        let clientSecret = string(configuration["oauthClientPath"])

        guard isHugoProject(projectPath) else {
            return ["ok": false, "error": "Choose a valid Hugo project first."]
        }
        guard !blogID.isEmpty else {
            return ["ok": false, "error": "Connect Google and choose a destination blog first."]
        }
        guard !articleIds.isEmpty else {
            return ["ok": false, "error": "Select at least one article."]
        }

        guard let paths = articlePaths(articleIds, projectPath: projectPath) else {
            return ["ok": false, "error": "One or more selected Hugo files could not be found."]
        }

        var arguments = paths + [
            "--site-root", projectPath,
            "--blog-id", blogID,
            "--mode", ["draft", "publish"].contains(mode) ? mode : "frontmatter",
            "--timezone", string(configuration["timezone"], fallback: "Europe/Bratislava"),
            "--publish-time", string(configuration["publishTime"], fallback: "09:00"),
            "--apply", "--yes"
        ]
        if !clientSecret.isEmpty { arguments += ["--client-secret", clientSecret] }
        if configuration["includeHeaderImage"] as? Bool == false { arguments.append("--no-header-image") }

        let result = runPublisher(
            projectPath: projectPath,
            scriptRelativePath: "scripts/blogger/publish_hugo_to_blogger.py",
            arguments: arguments
        )
        guard result.status == 0 else {
            return ["ok": false, "error": publisherError(result)]
        }
        return [
            "ok": true,
            "message": mode == "draft" ? "Saved \(paths.count) article(s) as Blogger drafts." : "Published \(paths.count) article(s) to Blogger.",
            "output": result.output,
            "articles": articles(in: projectPath),
            "activity": activity(projectPath: projectPath)
        ]
    }

    private func publishMedium(articleIds: [String], mode: String) -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        let tokenPath = string(configuration["mediumTokenPath"])
        let targetType = string(configuration["mediumTargetType"], fallback: "user")
        let targetID = string(configuration["mediumTargetId"])
        guard isHugoProject(projectPath) else { return ["ok": false, "error": "Choose a valid Hugo project first."] }
        let publishingMode = string(configuration["mediumPublishingMode"], fallback: tokenPath.isEmpty ? "import" : "api")
        if publishingMode == "import" {
            return prepareMediumImports(articleIds: articleIds, projectPath: projectPath)
        }
        guard !tokenPath.isEmpty, FileManager.default.fileExists(atPath: tokenPath) else {
            return ["ok": false, "error": "Connect an existing Medium integration token, or choose Assisted excerpt in Settings."]
        }
        guard !targetID.isEmpty else { return ["ok": false, "error": "Choose a Medium profile or publication first."] }
        guard !articleIds.isEmpty else { return ["ok": false, "error": "Select at least one article."] }
        guard let paths = articlePaths(articleIds, projectPath: projectPath) else {
            return ["ok": false, "error": "One or more selected Hugo files could not be found."]
        }

        var arguments = paths + [
            "--site-root", projectPath,
            "--token-file", tokenPath,
            "--target-type", targetType,
            "--target-id", targetID,
            "--mode", ["draft", "publish"].contains(mode) ? mode : "frontmatter",
            "--apply", "--yes"
        ]
        if configuration["includeHeaderImage"] as? Bool == false { arguments.append("--no-header-image") }
        let result = runPublisher(
            projectPath: projectPath,
            scriptRelativePath: "scripts/medium/publish_hugo_to_medium.py",
            arguments: arguments
        )
        guard result.status == 0 else { return ["ok": false, "error": publisherError(result)] }
        return [
            "ok": true,
            "message": mode == "draft" ? "Saved \(paths.count) article(s) as Medium drafts." : "Sent \(paths.count) article(s) to Medium.",
            "output": result.output,
            "articles": articles(in: projectPath),
            "activity": activity(projectPath: projectPath)
        ]
    }

    private func prepareMediumImports(articleIds: [String], projectPath: String) -> [String: Any] {
        guard !articleIds.isEmpty else { return ["ok": false, "error": "Select at least one article."] }
        guard let paths = articlePaths(articleIds, projectPath: projectPath) else {
            return ["ok": false, "error": "One or more selected Hugo files could not be found."]
        }
        let configuration = savedConfiguration()
        var arguments = paths + ["--site-root", projectPath, "--prepare-json"]
        if configuration["includeHeaderImage"] as? Bool == false { arguments.append("--no-header-image") }
        let result = runPublisher(
            projectPath: projectPath,
            scriptRelativePath: "scripts/medium/publish_hugo_to_medium.py",
            arguments: arguments
        )
        guard result.status == 0 else { return ["ok": false, "error": publisherError(result)] }
        guard let data = result.output.data(using: .utf8),
              let decoded = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return ["ok": false, "error": "The Medium adapter returned an invalid excerpt preview."]
        }
        let imports: [[String: String]] = decoded.compactMap { item in
            let id = string(item["articleId"])
            let content = string(item["contentHtml"])
            guard safeIdentifier(id), !content.isEmpty else { return nil }
            return [
                "articleId": id,
                "title": string(item["title"], fallback: id),
                "canonicalUrl": string(item["canonicalUrl"], fallback: "https://rausr.com/blog/\(id)/"),
                "contentHtml": content
            ]
        }
        guard imports.count == articleIds.count else {
            return ["ok": false, "error": "Could not prepare every selected Medium excerpt."]
        }
        return [
            "ok": true,
            "assistedImport": true,
            "imports": imports,
            "message": "Prepared \(imports.count) partial Medium edition(s)."
        ]
    }

    private func recordMediumImport(articleID: String, status: String, url: String) -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        guard isHugoProject(projectPath) else { return ["ok": false, "error": "Choose a valid Hugo project first."] }
        guard safeIdentifier(articleID) else { return ["ok": false, "error": "That article identifier is not valid."] }
        let source = "content/blog/\(articleID).md"
        let sourcePath = URL(fileURLWithPath: projectPath).appendingPathComponent(source).path
        guard FileManager.default.fileExists(atPath: sourcePath) else {
            return ["ok": false, "error": "The Hugo article could not be found."]
        }
        let normalizedStatus = status.lowercased() == "published" ? "PUBLIC" : "DRAFT"
        if !url.isEmpty {
            guard let storyURL = URL(string: url), storyURL.scheme?.lowercased() == "https" else {
                return ["ok": false, "error": "Enter a valid HTTPS Medium story URL, or leave it empty."]
            }
        }
        let now = ISO8601DateFormatter().string(from: Date())
        let canonicalURL = string(
            articles(in: projectPath).first { string($0["id"]) == articleID }?["canonicalUrl"],
            fallback: "https://rausr.com/blog/\(articleID)/"
        )
        var root = stateRoot("medium")
        root["version"] = 1
        var targets = root["targets"] as? [String: Any] ?? [:]
        var assisted = targets["assisted:manual"] as? [String: Any] ?? [:]
        assisted[source] = [
            "post_id": "assisted:\(articleID)",
            "url": url,
            "status": normalizedStatus,
            "canonical_url": canonicalURL,
            "updated_at": now
        ]
        targets["assisted:manual"] = assisted
        root["targets"] = targets
        var entries = root["activity"] as? [[String: Any]] ?? []
        entries.insert([
            "provider": "medium",
            "title": sourceTitle(source, projectPath: projectPath),
            "source": source,
            "action": "assisted excerpt confirmed",
            "status": normalizedStatus,
            "url": url,
            "detail": "Partial edition prepared locally; canonical set in Medium settings",
            "timestamp": now
        ], at: 0)
        root["activity"] = Array(entries.prefix(200))
        do {
            try saveProviderState(root, provider: "medium")
        } catch {
            return ["ok": false, "error": "Could not save Medium activity: \(error.localizedDescription)"]
        }
        var updated = configuration
        updated["mediumPublishingMode"] = "import"
        updated["mediumTargetType"] = "assisted"
        updated["mediumTargetId"] = "manual"
        updated["mediumTargetName"] = "Assisted excerpt"
        saveConfiguration(updated)
        return [
            "ok": true,
            "message": normalizedStatus == "PUBLIC" ? "Recorded as published on Medium." : "Recorded as a Medium draft.",
            "articles": articles(in: projectPath),
            "activity": activity(projectPath: projectPath)
        ]
    }

    private func prepareLinkedInPosts(articleIds: [String]) -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        guard isHugoProject(projectPath) else { return ["ok": false, "error": "Choose a valid Hugo project first."] }
        guard !articleIds.isEmpty else { return ["ok": false, "error": "Select at least one article."] }
        guard articlePaths(articleIds, projectPath: projectPath) != nil else {
            return ["ok": false, "error": "One or more selected Hugo files could not be found."]
        }
        guard let companyURL = linkedInCompanyURL(string(configuration["linkedinCompanyURL"], fallback: "https://www.linkedin.com/company/rausr/")) else {
            return ["ok": false, "error": "Enter a valid LinkedIn company page URL in Settings."]
        }
        let byID = Dictionary(uniqueKeysWithValues: articles(in: projectPath).compactMap { article -> (String, [String: Any])? in
            let id = string(article["id"])
            return id.isEmpty ? nil : (id, article)
        })
        let posts = articleIds.compactMap { id -> [String: String]? in
            guard let article = byID[id] else { return nil }
            let title = string(article["title"], fallback: id)
            let sourceURL = string(article["canonicalUrl"], fallback: "https://rausr.com/blog/\(id)/")
            let labels = article["labels"] as? [String] ?? []
            return [
                "articleId": id,
                "title": title,
                "canonicalUrl": sourceURL,
                "headerImage": string(article["image"]),
                "companyURL": companyURL,
                "postText": linkedInPostText(
                    title: title,
                    excerpt: string(article["excerpt"]),
                    sourceURL: sourceURL,
                    labels: labels
                )
            ]
        }
        guard posts.count == articleIds.count else {
            return ["ok": false, "error": "Could not prepare every selected article for LinkedIn."]
        }
        return [
            "ok": true,
            "assistedLinkedIn": true,
            "posts": posts,
            "message": "Prepared \(posts.count) LinkedIn Page post(s)."
        ]
    }

    private func linkedInPostText(title: String, excerpt: String, sourceURL: String, labels: [String]) -> String {
        var summary = excerpt.replacingOccurrences(of: "\n", with: " ")
        while summary.contains("  ") { summary = summary.replacingOccurrences(of: "  ", with: " ") }
        summary = summary.trimmingCharacters(in: .whitespacesAndNewlines)
        if summary.count > 280 {
            let candidate = String(summary.prefix(277))
            if let lastSpace = candidate.lastIndex(of: " ") { summary = String(candidate[..<lastSpace]) + "…" }
            else { summary = candidate + "…" }
        }
        if summary.isEmpty { summary = "A concise new perspective from the Rausr design journal." }

        let tagMap: [String: String] = [
            "ai": "AI", "ux-ui": "UXDesign", "ux ui": "UXDesign", "ux": "UXDesign",
            "graphic design": "GraphicDesign", "product design": "ProductDesign", "web design": "WebDesign",
            "branding": "Branding", "creativity": "Creativity", "philosophy": "DesignThinking",
            "history": "DesignHistory", "reports": "DesignResearch", "exhibition": "ExhibitionDesign",
            "hardware": "Technology", "series": "Design"
        ]
        var hashtags = ["Design"]
        for label in labels {
            let normalized = label.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
            let mapped = tagMap[normalized] ?? label.components(separatedBy: CharacterSet.alphanumerics.inverted)
                .filter { !$0.isEmpty }
                .map { $0.prefix(1).uppercased() + $0.dropFirst() }
                .joined()
            if !mapped.isEmpty && !hashtags.contains(where: { $0.caseInsensitiveCompare(mapped) == .orderedSame }) {
                hashtags.append(mapped)
            }
            if hashtags.count == 4 { break }
        }
        let tagLine = hashtags.map { "#\($0)" }.joined(separator: " ")
        return "\(title)\n\n\(summary)\n\nRead the full article on Rausr:\n\(sourceURL)\n\n\(tagLine)"
    }

    private func recordLinkedInPost(articleID: String, status: String, url: String) -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        guard isHugoProject(projectPath) else { return ["ok": false, "error": "Choose a valid Hugo project first."] }
        guard safeIdentifier(articleID) else { return ["ok": false, "error": "That article identifier is not valid."] }
        guard let companyURL = linkedInCompanyURL(string(configuration["linkedinCompanyURL"], fallback: "https://www.linkedin.com/company/rausr/")) else {
            return ["ok": false, "error": "Enter a valid LinkedIn company page URL in Settings."]
        }
        let source = "content/blog/\(articleID).md"
        let sourcePath = URL(fileURLWithPath: projectPath).appendingPathComponent(source).path
        guard FileManager.default.fileExists(atPath: sourcePath) else { return ["ok": false, "error": "The Hugo article could not be found."] }
        if !url.isEmpty {
            guard let postURL = URL(string: url), postURL.scheme?.lowercased() == "https",
                  postURL.host?.lowercased().hasSuffix("linkedin.com") == true else {
                return ["ok": false, "error": "Enter a valid HTTPS LinkedIn post URL, or leave it empty."]
            }
        }
        let normalizedStatus = status.lowercased() == "published" ? "PUBLISHED" : "DRAFT"
        let now = ISO8601DateFormatter().string(from: Date())
        let article = articles(in: projectPath).first { string($0["id"]) == articleID } ?? [:]
        let canonicalURL = string(article["canonicalUrl"], fallback: "https://rausr.com/blog/\(articleID)/")
        var root = stateRoot("linkedin")
        root["version"] = 1
        var targets = root["targets"] as? [String: Any] ?? [:]
        let targetKey = "company:\(companyURL)"
        var company = targets[targetKey] as? [String: Any] ?? [:]
        company[source] = [
            "post_id": "assisted:\(articleID)", "url": url, "status": normalizedStatus,
            "canonical_url": canonicalURL, "updated_at": now
        ]
        targets[targetKey] = company
        root["targets"] = targets
        var entries = root["activity"] as? [[String: Any]] ?? []
        entries.insert([
            "provider": "linkedin", "title": sourceTitle(source, projectPath: projectPath), "source": source,
            "action": "Page post confirmed", "status": normalizedStatus, "url": url,
            "detail": "Prepared from the Rausr article with source link and hashtags", "timestamp": now
        ], at: 0)
        root["activity"] = Array(entries.prefix(200))
        do { try saveProviderState(root, provider: "linkedin") }
        catch { return ["ok": false, "error": "Could not save LinkedIn activity: \(error.localizedDescription)"] }
        return [
            "ok": true,
            "message": normalizedStatus == "PUBLISHED" ? "Recorded as published on LinkedIn." : "Recorded as a LinkedIn draft.",
            "articles": articles(in: projectPath), "activity": activity(projectPath: projectPath)
        ]
    }

    private func linkedInCompanyURL(_ value: String) -> String? {
        guard let url = URL(string: value), url.scheme?.lowercased() == "https",
              let host = url.host?.lowercased(), host == "linkedin.com" || host == "www.linkedin.com",
              url.path.lowercased().hasPrefix("/company/") else { return nil }
        return url.absoluteString.hasSuffix("/") ? url.absoluteString : url.absoluteString + "/"
    }

    private func prepareFacebookPosts(articleIds: [String]) -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        guard isHugoProject(projectPath) else { return ["ok": false, "error": "Choose a valid Hugo project first."] }
        guard !articleIds.isEmpty else { return ["ok": false, "error": "Select at least one article."] }
        guard articlePaths(articleIds, projectPath: projectPath) != nil else {
            return ["ok": false, "error": "One or more selected Hugo files could not be found."]
        }
        guard let pageURL = facebookPageURL(string(configuration["facebookPageURL"], fallback: "https://www.facebook.com/rausrdotcom/")) else {
            return ["ok": false, "error": "Enter a valid Facebook Page URL in Settings."]
        }
        let byID = Dictionary(uniqueKeysWithValues: articles(in: projectPath).compactMap { article -> (String, [String: Any])? in
            let id = string(article["id"])
            return id.isEmpty ? nil : (id, article)
        })
        let posts = articleIds.compactMap { id -> [String: String]? in
            guard let article = byID[id] else { return nil }
            let title = string(article["title"], fallback: id)
            let sourceURL = string(article["canonicalUrl"], fallback: "https://rausr.com/blog/\(id)/")
            return [
                "articleId": id,
                "title": title,
                "canonicalUrl": sourceURL,
                "headerImage": string(article["image"]),
                "pageURL": pageURL,
                "postText": linkedInPostText(
                    title: title,
                    excerpt: string(article["excerpt"]),
                    sourceURL: sourceURL,
                    labels: article["labels"] as? [String] ?? []
                )
            ]
        }
        guard posts.count == articleIds.count else {
            return ["ok": false, "error": "Could not prepare every selected article for Facebook."]
        }
        return [
            "ok": true,
            "assistedFacebook": true,
            "posts": posts,
            "message": "Prepared \(posts.count) Facebook Page post(s)."
        ]
    }

    private func publishFacebook(articleIds: [String], mode: String) -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        let pageID = string(configuration["facebookPageId"])
        let tokenPath = string(configuration["facebookTokenPath"])
        guard isHugoProject(projectPath) else { return ["ok": false, "error": "Choose a valid Hugo project first."] }
        guard !articleIds.isEmpty else { return ["ok": false, "error": "Select at least one article."] }
        guard let paths = articlePaths(articleIds, projectPath: projectPath) else {
            return ["ok": false, "error": "One or more selected Hugo files could not be found."]
        }
        guard !pageID.isEmpty, !tokenPath.isEmpty, FileManager.default.fileExists(atPath: tokenPath) else {
            return ["ok": false, "error": "Connect the Facebook Page API in Settings first."]
        }
        var arguments = paths + [
            "--site-root", projectPath,
            "--page-id", pageID,
            "--token-file", tokenPath,
            "--graph-version", string(configuration["facebookGraphVersion"], fallback: "v26.0"),
            "--mode", ["draft", "publish"].contains(mode) ? mode : "frontmatter",
            "--apply", "--yes"
        ]
        if configuration["includeHeaderImage"] as? Bool == false { arguments.append("--no-header-image") }
        let result = runPublisher(
            projectPath: projectPath,
            scriptRelativePath: "scripts/facebook/publish_hugo_to_facebook.py",
            arguments: arguments
        )
        guard result.status == 0 else { return ["ok": false, "error": publisherError(result)] }
        return [
            "ok": true,
            "message": mode == "draft" ? "Saved \(paths.count) unpublished Facebook Page post(s)." : "Published \(paths.count) article(s) to Facebook.",
            "output": result.output,
            "articles": articles(in: projectPath),
            "activity": activity(projectPath: projectPath)
        ]
    }

    private func recordFacebookPost(articleID: String, status: String, url: String) -> [String: Any] {
        let configuration = savedConfiguration()
        let projectPath = string(configuration["projectPath"])
        guard isHugoProject(projectPath) else { return ["ok": false, "error": "Choose a valid Hugo project first."] }
        guard safeIdentifier(articleID) else { return ["ok": false, "error": "That article identifier is not valid."] }
        guard let pageURL = facebookPageURL(string(configuration["facebookPageURL"], fallback: "https://www.facebook.com/rausrdotcom/")) else {
            return ["ok": false, "error": "Enter a valid Facebook Page URL in Settings."]
        }
        let source = "content/blog/\(articleID).md"
        let sourcePath = URL(fileURLWithPath: projectPath).appendingPathComponent(source).path
        guard FileManager.default.fileExists(atPath: sourcePath) else { return ["ok": false, "error": "The Hugo article could not be found."] }
        if !url.isEmpty {
            guard let postURL = URL(string: url), postURL.scheme?.lowercased() == "https",
                  let host = postURL.host?.lowercased(), host == "facebook.com" || host.hasSuffix(".facebook.com") else {
                return ["ok": false, "error": "Enter a valid HTTPS Facebook post URL, or leave it empty."]
            }
        }
        let normalizedStatus = status.lowercased() == "published" ? "PUBLISHED" : "DRAFT"
        let now = ISO8601DateFormatter().string(from: Date())
        let article = articles(in: projectPath).first { string($0["id"]) == articleID } ?? [:]
        let canonicalURL = string(article["canonicalUrl"], fallback: "https://rausr.com/blog/\(articleID)/")
        var root = stateRoot("facebook")
        root["version"] = 1
        var targets = root["targets"] as? [String: Any] ?? [:]
        let targetKey = "page:\(pageURL)"
        var page = targets[targetKey] as? [String: Any] ?? [:]
        page[source] = [
            "post_id": "assisted:\(articleID)", "url": url, "status": normalizedStatus,
            "canonical_url": canonicalURL, "updated_at": now
        ]
        targets[targetKey] = page
        root["targets"] = targets
        var entries = root["activity"] as? [[String: Any]] ?? []
        entries.insert([
            "provider": "facebook", "title": sourceTitle(source, projectPath: projectPath), "source": source,
            "action": "Page post confirmed", "status": normalizedStatus, "url": url,
            "detail": "Prepared from the Rausr article with source link and hashtags", "timestamp": now
        ], at: 0)
        root["activity"] = Array(entries.prefix(200))
        do { try saveProviderState(root, provider: "facebook") }
        catch { return ["ok": false, "error": "Could not save Facebook activity: \(error.localizedDescription)"] }
        return [
            "ok": true,
            "message": normalizedStatus == "PUBLISHED" ? "Recorded as published on Facebook." : "Recorded as a Facebook draft.",
            "articles": articles(in: projectPath), "activity": activity(projectPath: projectPath)
        ]
    }

    private func facebookPageURL(_ value: String) -> String? {
        guard let url = URL(string: value), url.scheme?.lowercased() == "https",
              let host = url.host?.lowercased(), host == "facebook.com" || host == "www.facebook.com",
              url.pathComponents.count > 1 else { return nil }
        return url.absoluteString.hasSuffix("/") ? url.absoluteString : url.absoluteString + "/"
    }

    private func runPublisher(projectPath: String, scriptRelativePath: String, arguments: [String]) -> (status: Int32, output: String, error: String) {
        let root = URL(fileURLWithPath: projectPath)
        let script = root.appendingPathComponent(scriptRelativePath).path
        guard FileManager.default.fileExists(atPath: script) else {
            return (127, "", "Publisher script not found at \(script)")
        }

        let pythonCandidates = [
            root.appendingPathComponent(".venv-blogger/bin/python").path,
            root.appendingPathComponent("scripts/blogger/.venv-blogger/bin/python").path,
            "/opt/homebrew/bin/python3",
            "/usr/local/bin/python3"
        ]
        guard let python = pythonCandidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) else {
            return (127, "", "The publisher Python environment is not accessible. Rebuild the extension after applying its local-development entitlements.")
        }
        let hugoCandidates = ["/opt/homebrew/bin/hugo", "/usr/local/bin/hugo"]
        guard let hugo = hugoCandidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) else {
            return (127, "", "Hugo is not accessible at /opt/homebrew/bin/hugo or /usr/local/bin/hugo.")
        }

        let process = Process()
        let standardOutput = Pipe()
        let standardError = Pipe()
        process.executableURL = URL(fileURLWithPath: python)
        process.arguments = [script, "--hugo", hugo] + arguments
        process.currentDirectoryURL = root
        process.standardOutput = standardOutput
        process.standardError = standardError
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Rausr Publisher", isDirectory: true)
        let config = support.appendingPathComponent("config", isDirectory: true)
        let state = support.appendingPathComponent("state", isDirectory: true)
        let cache = FileManager.default.temporaryDirectory.appendingPathComponent("hugo-cache", isDirectory: true)
        try? FileManager.default.createDirectory(at: config, withIntermediateDirectories: true)
        try? FileManager.default.createDirectory(at: state, withIntermediateDirectories: true)
        try? FileManager.default.createDirectory(at: cache, withIntermediateDirectories: true)
        var environment = ProcessInfo.processInfo.environment
        environment["PATH"] = [
            root.appendingPathComponent(".venv-blogger/bin").path,
            "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"
        ].joined(separator: ":")
        environment["XDG_CONFIG_HOME"] = config.path
        environment["XDG_STATE_HOME"] = state.path
        environment["HUGO_CACHEDIR"] = cache.path
        process.environment = environment

        do {
            try process.run()
            process.waitUntilExit()
            let output = String(data: standardOutput.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
            let error = String(data: standardError.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
            return (process.terminationStatus, output, error)
        } catch {
            return (127, "", error.localizedDescription)
        }
    }

    private func publisherError(_ result: (status: Int32, output: String, error: String)) -> String {
        let detail = result.error.trimmingCharacters(in: .whitespacesAndNewlines)
        let fallback = result.output.trimmingCharacters(in: .whitespacesAndNewlines)
        return detail.isEmpty ? (fallback.isEmpty ? "Publisher exited with status \(result.status)." : fallback) : detail
    }

    private func articles(in projectPath: String) -> [[String: Any]] {
        guard isHugoProject(projectPath) else { return [] }
        let contentRoot = URL(fileURLWithPath: projectPath).appendingPathComponent("content/blog")
        let bloggerMappings = providerMappings("blogger")
        let mediumMappings = providerMappings("medium")
        let linkedinMappings = providerMappings("linkedin")
        let facebookMappings = providerMappings("facebook")
        let files = (try? FileManager.default.contentsOfDirectory(
            at: contentRoot,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        )) ?? []

        return files.filter { $0.pathExtension.lowercased() == "md" }.compactMap { url in
            guard let source = try? String(contentsOf: url, encoding: .utf8) else { return nil }
            let frontmatter = frontmatterValues(source)
            let id = url.deletingPathExtension().lastPathComponent
            let rawDate = string(frontmatter["date"])
            let labels = list(frontmatter["tags"])
            let isDraft = string(frontmatter["draft"]).lowercased() == "true"
            let sourceKey = "content/blog/\(id).md"
            let blogger = bloggerMappings[sourceKey] ?? [:]
            let medium = mediumMappings[sourceKey] ?? [:]
            let linkedin = linkedinMappings[sourceKey] ?? [:]
            let facebook = facebookMappings[sourceKey] ?? [:]
            var destinations: [[String: String]] = []
            if !blogger.isEmpty {
                let raw = string(blogger["status"], fallback: "LIVE").uppercased()
                destinations.append([
                    "provider": "blogger",
                    "providerLabel": "Blogger",
                    "status": raw == "DRAFT" ? "draft" : "published",
                    "statusLabel": raw == "DRAFT" ? "Draft" : (raw == "SCHEDULED" ? "Scheduled" : "Published"),
                    "url": string(blogger["url"]),
                    "updatedAt": string(blogger["updated_at"])
                ])
            }
            if !medium.isEmpty {
                let raw = string(medium["status"], fallback: "PUBLIC").uppercased()
                destinations.append([
                    "provider": "medium",
                    "providerLabel": "Medium",
                    "status": raw == "DRAFT" ? "draft" : "published",
                    "statusLabel": raw == "DRAFT" ? "Draft" : (raw == "UNLISTED" ? "Unlisted" : "Published"),
                    "url": string(medium["url"]),
                    "updatedAt": string(medium["updated_at"])
                ])
            }
            if !linkedin.isEmpty {
                let raw = string(linkedin["status"], fallback: "PUBLISHED").uppercased()
                destinations.append([
                    "provider": "linkedin",
                    "providerLabel": "LinkedIn",
                    "status": raw == "DRAFT" ? "draft" : "published",
                    "statusLabel": raw == "DRAFT" ? "Draft" : "Published",
                    "url": string(linkedin["url"]),
                    "updatedAt": string(linkedin["updated_at"])
                ])
            }
            if !facebook.isEmpty {
                let raw = string(facebook["status"], fallback: "PUBLISHED").uppercased()
                destinations.append([
                    "provider": "facebook",
                    "providerLabel": "Facebook",
                    "status": raw == "DRAFT" ? "draft" : "published",
                    "statusLabel": raw == "DRAFT" ? "Draft" : "Published",
                    "url": string(facebook["url"]),
                    "updatedAt": string(facebook["updated_at"])
                ])
            }
            var filterStates = Array(Set(destinations.compactMap { $0["status"] }))
            if isDraft && !filterStates.contains("draft") { filterStates.append("draft") }
            if destinations.isEmpty && !isDraft { filterStates.append("ready") }
            let status = filterStates.contains("published") ? "published" : (filterStates.contains("draft") ? "draft" : "ready")
            let statusLabel: String
            if destinations.count > 1 {
                statusLabel = "\(destinations.count) destinations"
            } else if let destination = destinations.first {
                statusLabel = "\(destination["statusLabel"] ?? "Sent") · \(destination["providerLabel"] ?? "Publisher")"
            } else {
                statusLabel = isDraft ? "Hugo draft" : "Ready"
            }
            let image = string(frontmatter["preview_image"], fallback: string(frontmatter["header_image"]))
            let excerpt = string(frontmatter["description"], fallback: markdownExcerpt(source))
            let canonicalURL = string(blogger["canonical_url"], fallback: string(medium["canonical_url"], fallback: string(linkedin["canonical_url"], fallback: string(facebook["canonical_url"], fallback: "https://rausr.com/blog/\(id)/"))))
            return [
                "id": id,
                "title": string(frontmatter["title"], fallback: id.replacingOccurrences(of: "-", with: " ").capitalized),
                "date": displayDate(rawDate),
                "isoDate": rawDate,
                "status": status,
                "statusLabel": statusLabel,
                "filterStates": filterStates,
                "labels": labels,
                "image": publicImageURL(image),
                "excerpt": excerpt,
                "canonicalUrl": canonicalURL,
                "destinations": destinations,
                "bloggerUrl": string(blogger["url"]),
                "mediumUrl": string(medium["url"]),
                "linkedinUrl": string(linkedin["url"]),
                "facebookUrl": string(facebook["url"])
            ] as [String: Any]
        }.sorted { string($0["isoDate"]) > string($1["isoDate"]) }
    }

    private func frontmatterValues(_ source: String) -> [String: Any] {
        let lines = source.components(separatedBy: .newlines)
        guard lines.first?.trimmingCharacters(in: .whitespaces) == "---" else { return [:] }
        var result: [String: Any] = [:]
        for line in lines.dropFirst() {
            if line.trimmingCharacters(in: .whitespaces) == "---" { break }
            guard !line.hasPrefix(" "), let colon = line.firstIndex(of: ":") else { continue }
            let key = String(line[..<colon]).trimmingCharacters(in: .whitespaces)
            let value = String(line[line.index(after: colon)...]).trimmingCharacters(in: .whitespaces)
            if value.hasPrefix("[") && value.hasSuffix("]") {
                let inner = value.dropFirst().dropLast()
                result[key] = inner.split(separator: ",").map { unquote(String($0).trimmingCharacters(in: .whitespaces)) }
            } else {
                result[key] = unquote(value)
            }
        }
        return result
    }

    private func markdownExcerpt(_ source: String) -> String {
        let body = source.components(separatedBy: "---").dropFirst(2).joined(separator: "---")
        let cleaned = body.components(separatedBy: .newlines)
            .filter { !$0.trimmingCharacters(in: .whitespaces).hasPrefix("{{") && !$0.trimmingCharacters(in: .whitespaces).hasPrefix("<") }
            .joined(separator: " ")
            .replacingOccurrences(of: "#", with: "")
            .replacingOccurrences(of: "*", with: "")
            .replacingOccurrences(of: "  ", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return String(cleaned.prefix(240))
    }

    private func stateRoot(_ provider: String) -> [String: Any] {
        let folder = provider == "medium" ? "hugo-medium" : (provider == "linkedin" ? "hugo-linkedin" : (provider == "facebook" ? "hugo-facebook" : "hugo-blogger"))
        let statePath = applicationSupportDirectory().appendingPathComponent("state/\(folder)/state.json")
        guard let data = try? Data(contentsOf: statePath),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
        return root
    }

    private func saveProviderState(_ root: [String: Any], provider: String) throws {
        let folder = provider == "medium" ? "hugo-medium" : (provider == "linkedin" ? "hugo-linkedin" : (provider == "facebook" ? "hugo-facebook" : "hugo-blogger"))
        let statePath = applicationSupportDirectory().appendingPathComponent("state/\(folder)/state.json")
        try FileManager.default.createDirectory(at: statePath.deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try JSONSerialization.data(withJSONObject: root, options: [.prettyPrinted, .sortedKeys])
        try data.write(to: statePath, options: [.atomic])
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: statePath.path)
    }

    private func providerMappings(_ provider: String) -> [String: [String: Any]] {
        let root = stateRoot(provider)
        let collectionName = provider == "blogger" ? "blogs" : "targets"
        guard let collections = root[collectionName] as? [String: Any] else { return [:] }
        let configuration = savedConfiguration()
        let selectedKey: String
        if provider == "medium" {
            selectedKey = string(configuration["mediumPublishingMode"], fallback: "import") == "import"
                ? "assisted:manual"
                : "\(string(configuration["mediumTargetType"], fallback: "user")):\(string(configuration["mediumTargetId"]))"
        } else if provider == "linkedin" {
            let rawURL = string(configuration["linkedinCompanyURL"], fallback: "https://www.linkedin.com/company/rausr/")
            selectedKey = "company:\(linkedInCompanyURL(rawURL) ?? rawURL)"
        } else if provider == "facebook" {
            let pageID = string(configuration["facebookPageId"])
            let rawURL = string(configuration["facebookPageURL"], fallback: "https://www.facebook.com/rausrdotcom/")
            selectedKey = string(configuration["facebookPublishingMode"], fallback: "assisted") == "api" && !pageID.isEmpty
                ? "page:\(pageID)"
                : "page:\(facebookPageURL(rawURL) ?? rawURL)"
        } else {
            selectedKey = string(configuration["blogId"])
        }
        if !selectedKey.isEmpty,
           let selected = collections[selectedKey] as? [String: Any] {
            return selected.reduce(into: [String: [String: Any]]()) { result, item in
                if let mapping = item.value as? [String: Any] { result[item.key] = mapping }
            }
        }
        return collections.values.reduce(into: [String: [String: Any]]()) { result, value in
            guard let collection = value as? [String: Any] else { return }
            for (source, value) in collection where result[source] == nil {
                if let mapping = value as? [String: Any] { result[source] = mapping }
            }
        }
    }

    private func activity(projectPath: String) -> [[String: String]] {
        var rawItems: [[String: Any]] = []
        for provider in ["blogger", "medium", "linkedin", "facebook"] {
            let root = stateRoot(provider)
            let saved = root["activity"] as? [[String: Any]] ?? []
            rawItems.append(contentsOf: saved)
            let loggedSources = Set(saved.compactMap { string($0["source"]).isEmpty ? nil : string($0["source"]) })

            // Older state files predate the activity log. Surface their mappings as history too.
            for (source, mapping) in providerMappings(provider) where !loggedSources.contains(source) {
                rawItems.append([
                    "provider": provider,
                    "title": sourceTitle(source, projectPath: projectPath),
                    "source": source,
                    "action": "previously recorded",
                    "status": string(mapping["status"], fallback: provider == "medium" ? "PUBLIC" : (["linkedin", "facebook"].contains(provider) ? "PUBLISHED" : "LIVE")),
                    "url": string(mapping["url"]),
                    "timestamp": string(mapping["updated_at"])
                ])
            }
        }
        let sorted = rawItems.sorted { string($0["timestamp"]) > string($1["timestamp"]) }.prefix(200)
        let rendered = sorted.map { item -> [String: String] in
            let provider = string(item["provider"], fallback: "blogger")
            let providerLabel = provider == "medium" ? "Medium" : (provider == "linkedin" ? "LinkedIn" : (provider == "facebook" ? "Facebook" : "Blogger"))
            let status = string(item["status"], fallback: "LIVE").uppercased()
            let statusLabel: String
            switch status {
            case "DRAFT": statusLabel = "Draft"
            case "SCHEDULED": statusLabel = "Scheduled"
            case "FAILED": statusLabel = "Failed"
            case "UNLISTED": statusLabel = "Unlisted"
            default: statusLabel = "Published"
            }
            let action = string(item["action"], fallback: "published")
            let extra = string(item["detail"])
            return [
                "title": string(item["title"], fallback: sourceTitle(string(item["source"]), projectPath: projectPath)),
                "detail": "\(providerLabel) · \(statusLabel) · \(action)" + (extra.isEmpty ? "" : " · \(extra)"),
                "time": activityTime(string(item["timestamp"])),
                "timestamp": string(item["timestamp"]),
                "icon": provider == "medium" ? "M" : (provider == "linkedin" ? "in" : (provider == "facebook" ? "f" : "B")),
                "provider": provider,
                "status": status.lowercased(),
                "url": string(item["url"])
            ]
        }
        if !rendered.isEmpty { return rendered }
        return [[
            "title": "No publication activity yet",
            "detail": "Published posts and drafts will appear here",
            "time": "Ready",
            "timestamp": "",
            "icon": "↗",
            "provider": "system",
            "status": "ready",
            "url": ""
        ]]
    }

    private func sourceTitle(_ source: String, projectPath: String) -> String {
        guard !source.isEmpty else { return "Untitled article" }
        let path = URL(fileURLWithPath: projectPath).appendingPathComponent(source)
        if let contents = try? String(contentsOf: path, encoding: .utf8) {
            let title = string(frontmatterValues(contents)["title"])
            if !title.isEmpty { return title }
        }
        return path.deletingPathExtension().lastPathComponent.replacingOccurrences(of: "-", with: " ").capitalized
    }

    private func activityTime(_ timestamp: String) -> String {
        guard !timestamp.isEmpty else { return "Earlier" }
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: timestamp) else { return displayDate(timestamp) }
        let display = DateFormatter()
        display.locale = Locale(identifier: "en_GB")
        display.dateFormat = Calendar.current.isDateInToday(date) ? "HH:mm" : "d MMM · HH:mm"
        return display.string(from: date)
    }

    private func isHugoProject(_ path: String) -> Bool {
        guard !path.isEmpty else { return false }
        let root = URL(fileURLWithPath: path)
        let content = root.appendingPathComponent("content/blog").path
        let configs = ["hugo.toml", "config.toml", "hugo.yaml", "config.yaml"]
        return FileManager.default.fileExists(atPath: content) && configs.contains {
            FileManager.default.fileExists(atPath: root.appendingPathComponent($0).path)
        }
    }

    private func applicationSupportDirectory() -> URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Rausr Publisher", isDirectory: true)
    }

    private func hugoVersion() -> String {
        for path in ["/opt/homebrew/bin/hugo", "/usr/local/bin/hugo", "/usr/bin/hugo"] where FileManager.default.isExecutableFile(atPath: path) {
            let process = Process()
            let pipe = Pipe()
            process.executableURL = URL(fileURLWithPath: path)
            process.arguments = ["version"]
            process.standardOutput = pipe
            process.standardError = pipe
            if (try? process.run()) != nil {
                process.waitUntilExit()
                let output = String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
                return output.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
        return "Native bridge ready · Hugo executable not found"
    }

    private func finish(_ context: NSExtensionContext, _ payload: [String: Any]) {
        let response = NSExtensionItem()
        if #available(macOS 11.0, *) {
            response.userInfo = [SFExtensionMessageKey: payload]
        } else {
            response.userInfo = ["message": payload]
        }
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }

    private func displayDate(_ value: String) -> String {
        let input = String(value.prefix(10))
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: input) else { return value }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.dateFormat = "d MMM yyyy"
        return formatter.string(from: date)
    }

    private func publicImageURL(_ path: String) -> String {
        guard !path.isEmpty else { return "" }
        if path.hasPrefix("http://") || path.hasPrefix("https://") { return path }
        return "https://rausr.com/" + path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private func safeIdentifier(_ id: String) -> Bool {
        !id.isEmpty && !id.contains("/") && !id.contains("\\") && !id.contains("..")
    }

    private func unquote(_ value: String) -> String {
        guard value.count >= 2 else { return value }
        if (value.hasPrefix("\"") && value.hasSuffix("\"")) || (value.hasPrefix("'") && value.hasSuffix("'")) {
            return String(value.dropFirst().dropLast())
        }
        return value
    }

    private func string(_ value: Any?, fallback: String = "") -> String {
        guard let value else { return fallback }
        if let string = value as? String, !string.isEmpty { return string }
        return fallback
    }

    private func blank(_ value: Any?) -> Bool { string(value).isEmpty }

    private func list(_ value: Any?) -> [String] {
        if let values = value as? [String] { return values }
        return []
    }
}
