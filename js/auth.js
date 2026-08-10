
const signinTab =
document.getElementById("signinTab");

const signupTab =
document.getElementById("signupTab");

const signinForm =
document.getElementById("signinForm");

const signupForm =
document.getElementById("signupForm");


function showSignin() {

    if (!signinTab || !signupTab) return;

    if (!signinForm || !signupForm) return;

    signinTab.classList.add("active");
    signupTab.classList.remove("active");

    signinForm.classList.add("active-form");
    signupForm.classList.remove("active-form");

}

function showSignup() {

    if (!signinTab || !signupTab) return;

    if (!signinForm || !signupForm) return;

    signupTab.classList.add("active");
    signinTab.classList.remove("active");

    signupForm.classList.add("active-form");
    signinForm.classList.remove("active-form");

}

if (signinTab) {

    signinTab.addEventListener(
        "click",
        showSignin
    );

}

if (signupTab) {

    signupTab.addEventListener(
        "click",
        showSignup
    );

}



function togglePassword(
    inputId,
    buttonId
) {

    const input =
        document.getElementById(inputId);

    const button =
        document.getElementById(buttonId);

    if (!input || !button) {

        return;

    }

    button.addEventListener(
        "click",
        function () {

            const isPassword =
                input.type === "password";

            input.type =
                isPassword
                    ? "text"
                    : "password";

            button.innerHTML =
                isPassword
                    ? '<i class="fa-solid fa-eye-slash"></i>'
                    : '<i class="fa-solid fa-eye"></i>';

        }
    );

}

togglePassword(
    "password",
    "togglePassword"
);

togglePassword(
    "signupPassword",
    "toggleSignupPassword"
);

togglePassword(
    "confirmPassword",
    "toggleConfirmPassword"
);



function isValidEmail(email) {

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);

}


function isValidMobile(mobile) {

    return /^\d{10}$/.test(mobile);

}


function isValidPassword(password) {

    return password.length >= 6;

}


if (signinForm) {

    signinForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const emailInput =
                document.getElementById(
                    "loginEmail"
                );

            const passwordInput =
                document.getElementById(
                    "password"
                );

            if (
                !emailInput ||
                !passwordInput
            ) {

                console.error(
                    "ASTRA: Login fields not found."
                );

                return;

            }

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            if (
                email === "" ||
                password === ""
            ) {

                alert(
                    "Please enter Email and Password."
                );

                return;

            }

            if (
                !isValidEmail(email)
            ) {

                alert(
                    "Please enter a valid email address."
                );

                emailInput.focus();

                return;

            }

            sessionStorage.setItem(
                "ASTRA_LOGGED_IN",
                "true"
            );

            sessionStorage.setItem(
                "ASTRA_USER_EMAIL",
                email
            );

            alert(
                "Login Successful!"
            );

            window.location.href =
                "photo-editor.html";

        }
    );

}


if (signupForm) {

    signupForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const nameInput =
                document.getElementById(
                    "fullName"
                );

            const emailInput =
                document.getElementById(
                    "signupEmail"
                );

            const mobileInput =
                document.getElementById(
                    "mobile"
                );

            const passwordInput =
                document.getElementById(
                    "signupPassword"
                );

            const confirmInput =
                document.getElementById(
                    "confirmPassword"
                );

            if (
                !nameInput ||
                !emailInput ||
                !mobileInput ||
                !passwordInput ||
                !confirmInput
            ) {

                console.error(
                    "ASTRA: Signup fields not found."
                );

                return;

            }

            const name =
                nameInput.value.trim();

            const email =
                emailInput.value.trim();

            const mobile =
                mobileInput.value.trim();

            const password =
                passwordInput.value;

            const confirmPassword =
                confirmInput.value;

            if (
                name === "" ||
                email === "" ||
                mobile === "" ||
                password === "" ||
                confirmPassword === ""
            ) {

                alert(
                    "Please fill all fields."
                );

                return;

            }

            if (name.length < 2) {

                alert(
                    "Please enter a valid name."
                );

                nameInput.focus();

                return;

            }

            if (
                !isValidEmail(email)
            ) {

                alert(
                    "Please enter a valid email address."
                );

                emailInput.focus();

                return;

            }

            if (
                !isValidMobile(mobile)
            ) {

                alert(
                    "Please enter a valid 10-digit mobile number."
                );

                mobileInput.focus();

                return;

            }

            if (
                !isValidPassword(password)
            ) {

                alert(
                    "Password must contain at least 6 characters."
                );

                passwordInput.focus();

                return;

            }

            if (
                password !==
                confirmPassword
            ) {

                alert(
                    "Passwords do not match."
                );

                confirmInput.focus();

                return;

            }

            sessionStorage.setItem(
                "ASTRA_USER_NAME",
                name
            );

            sessionStorage.setItem(
                "ASTRA_USER_EMAIL",
                email
            );

            sessionStorage.setItem(
                "ASTRA_USER_MOBILE",
                mobile
            );

            sessionStorage.setItem(
                "ASTRA_LOGGED_IN",
                "true"
            );

            alert(
                "Account Created Successfully!"
            );

            window.location.href =
                "photo-editor.html";

        }
    );

}



console.log(
    "ASTRA: Authentication System Loaded Successfully."
);


const urlParams = new URLSearchParams(
    window.location.search
);

const authMode = urlParams.get("mode");

if (authMode === "signup") {

    showSignup();

} else {

    showSignin();

}