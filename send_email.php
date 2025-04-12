<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name    = $_POST['name'];
    $mobile  = $_POST['mobile'];
    $email   = $_POST['email'];
    $message = $_POST['message'];

    $to = "smartofficial135@gmail.com";
    $subject = "New Contact Request from Sabkamart";
    $body = "Name: $name\nMobile: $mobile\nEmail: $email\nMessage:\n$message";
    $headers = "From: no-reply@sabkamart.com";

    if (mail($to, $subject, $body, $headers)) {
        echo "Message sent successfully!";
    } else {
        echo "Message delivery failed...";
    }
}
?>