// components/user_form/script.js

export default function initUserForm(prefix, userId) {
    const imageInput = document.getElementById(`image_${prefix}`);
    const preview = document.getElementById(`preview_${prefix}`);

    imageInput?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // EMAIL VALIDATION
    let timeout;
    const emailInput = document.getElementById(`id_email_${prefix}`);

    emailInput?.addEventListener("input", function () {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
            fetch("/anahtar/api/check-email", {
                method: "POST",
                body: new FormData(document.getElementById(`${prefix}`))
            });
        }, 500);
    });
}