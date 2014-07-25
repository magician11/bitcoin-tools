var nodemailer = require('nodemailer');

function emailAdmin(emailSubject, emailMessage) {

    var smtpTransport = nodemailer.createTransport("SMTP",{
        service: "Gmail",
        auth: {
            user: process.env.EMAIL_AUTH_USER,
            pass: process.env.EMAIL_AUTH_PASSWORD
        }
    });

    var mailOptions = {
        from: "Bitcoin Tools <admin@bitcoin.com>",
        to: process.env.EMAIL_RECIPIENT,
        subject: emailSubject,
        html: emailMessage
    }

    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error.message);
        }else{
            console.log("Email '" + emailSubject + "' successfully sent to " + process.env.EMAIL_RECIPIENT);
        }

        smtpTransport.close();
    });
}

module.exports = emailAdmin;