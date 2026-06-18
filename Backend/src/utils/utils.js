// Generate OTP
function generateOTP() {

    const otp = Math.floor(
        100000 + Math.random() * 900000
    );

    return {
        otp: otp.toString(),
    };
}


// Email HTML Template
function verificationEmailTemplate(username, otp) {

    return `
<!DOCTYPE html>
<html>

<head>

    <meta charset="UTF-8">

    <style>

        body {
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            font-family: Arial, sans-serif;
        }


        .container {
            max-width: 500px;
            margin: auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }


        .otp {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            letter-spacing: 8px;
            margin: 25px 0;
        }


        .footer {
            color: #777;
            font-size: 13px;
            margin-top: 20px;
        }

    </style>

</head>


<body>

    <div class="container">

        <h2>Email Verification</h2>


        <p>
            Hello <strong>${username}</strong>,
        </p>


        <p>
            Thank you for registering.
            Use the OTP below to verify your email address.
        </p>


        <div class="otp">
            ${otp}
        </div>


        <p>
            This OTP will expire in <strong>10 minutes</strong>.
        </p>


        <p>
            Please do not share this OTP with anyone.
        </p>


        <p class="footer">
            If you did not create this account, ignore this email.
        </p>


    </div>

</body>

</html>
`;
}


module.exports = {
    generateOTP,
    verificationEmailTemplate
};