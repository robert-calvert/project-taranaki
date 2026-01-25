import z from "zod";
import nodemailer from "nodemailer";

export async function sendGmailNotification(body: string, subject: string) {
    const emailResult = z.email().safeParse(process.env.EMAIL_USER);
    if (!emailResult.success) {
        throw new Error(
            "Missing or invalid environment variable for the notification email address: " +
                z.prettifyError(emailResult.error)
        );
    }

    const passwordResult = z
        .string()
        .nonempty()
        .safeParse(process.env.EMAIL_PASS);
    if (!passwordResult.success) {
        throw new Error(
            "Missing or invalid environment variable for the notification email password: " +
                z.prettifyError(passwordResult.error)
        );
    }

    const emailAddress = emailResult.data;
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: emailAddress,
            pass: passwordResult.data,
        },
    });

    const fromName = process.env.EMAIL_FROM || "Project Taranaki";
    await transporter.sendMail({
        from: `"${fromName}" <${emailAddress}>`,
        to: emailAddress,
        subject: subject,
        text: body,
    });
}
