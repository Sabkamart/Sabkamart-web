// JavaScript Document
$(document).ready(function() {

    "use strict";

    /*----------------------------------------------------*/
    /*  Contact Form Submit Function
    /*----------------------------------------------------*/

    $(".contact-form").submit(function(e) {
        e.preventDefault();

        var name = $(".name");
        var email = $(".email");
        var msg = $(".message");

        var flag = true;

        // Custom validation for name
        if (name.val() == "") {
            name.closest(".form-control").addClass("error");
            name.focus();
            flag = false;
        } else {
            name.closest(".form-control").removeClass("error").addClass("success");
        }

        // Custom validation for email
        if (email.val() == "") {
            email.closest(".form-control").addClass("error");
            email.focus();
            flag = false;
        } else {
            email.closest(".form-control").removeClass("error").addClass("success");
        }

        // Custom validation for message
        if (msg.val() == "") {
            msg.closest(".form-control").addClass("error");
            msg.focus();
            flag = false;
        } else {
            msg.closest(".form-control").removeClass("error").addClass("success");
        }

        // Prevent submission if validation fails
        if (!flag) {
            return false;
        }

        var dataString = {
            name: name.val(),
            email: email.val(),
            msg: msg.val()
        };

        $(".loading").fadeIn("slow").html("Loading...");

        $.ajax({
            type: "POST",
            url: "php/contactForm.php",
            data: dataString,
            success: function(d) {
                $(".form-control").removeClass("success");

                if(d == 'success') {
                    $('.loading').fadeIn('slow').html('<font color="#48af4b">Mail sent successfully.</font>').delay(3000).fadeOut('slow');
                    $(".contact-form")[0].reset(); // Reset the form fields
                } else {
                    $('.loading').fadeIn('slow').html('<font color="#ff5607">Mail not sent.</font>').delay(3000).fadeOut('slow');
                }
            }
        });

        return false;
    });

    /*----------------------------------------------------*/
    /*  Reset Form Fields
    /*----------------------------------------------------*/

    $("#reset").on('click', function() {
        $(".form-control").removeClass("success").removeClass("error");
    });

    /*----------------------------------------------------*/
    /*  Contact Form Validation using jQuery Validate
    /*----------------------------------------------------*/
    
    $(".contact-form").validate({
        rules: {
            name: {
                required: true,
                minlength: 1,
                maxlength: 16,
            },
            email: {
                required: true,
                email: true,
            },
            message: {
                required: true,
                minlength: 2,
            }
        },
        messages: {
            name: {
                required: "Please enter no less than (1) characters"
            },
            email: {
                required: "We need your email address to contact you",
                email: "Your email address must be in the format of name@domain.com"
            },
            message: {
                required: "Please enter no less than (2) characters"
            }
        },
        submitHandler: function(form) {
            form.submit(); // Submit form if validation passes
        }
    });
});




