---
title: "contact us"
description: "Contact informations and contact form. We are waiting for your request."
repo: "#" # delete this line if you want blog-like posts for projects
weight: 0
draft: false
type: "singles"
---

<div style="margin: auto; padding: 1rem; flex: 1 0 auto;">

<ul class="col col-md-auto" style="text-align: center; margin-bottom: 5rem !important;">
<li class="contact-info"><strong>E-mail: </strong><a href="mailto:hello@rausr.com">hello@rausr.com</a></li>
<!--googleoff: all-->
<li class="contact-info">
<strong>Phone: </strong>+421 910 160 251
</li>
<!--googleon: all-->
</ul>

<div class="contactform">
<div class="row justify-content-md-center">
<div class="col col-md-6 mx-2" style="max-width: 325px !important;">
<form name="contact" method="POST" action="/thanks/" netlify>
<div class="form-group">
	<input type="text" name="name" placeholder="Name:*" onfocus="this.placeholder = ''" onblur="this.placeholder = 'Your Name:'" required/>
</div>
<div class="form-group">
	<input type="tel" name="phone" placeholder="Phone:" onfocus="this.placeholder = ''" onblur="this.placeholder = 'Phone:'" required/>
</div>
<div class="form-group">
	<input type="email" name="email" placeholder="E-mail:*" onfocus="this.placeholder = ''" onblur="this.placeholder = 'E-mail:'" required/>
</div>
<div class="form-group">
	<span class="contact-required-info">*required field</span>
</div>
</div>
<div class="col col-md-6 mx-2" style="max-width: 325px !important;">
<div class="form-group">
	<textarea name="message" placeholder="Message:*" onfocus="this.placeholder = ''" onblur="this.placeholder = 'Message:'" required></textarea>
	<button class="btn button-right" type="submit">Send</button>
</div>
</div>
</form>
</div>

</div>