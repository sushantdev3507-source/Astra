// ==============================
// Tabs
// ==============================

const signinTab = document.getElementById("signinTab");
const signupTab = document.getElementById("signupTab");

const signinForm = document.getElementById("signinForm");
const signupForm = document.getElementById("signupForm");

signinTab.onclick = () => {

    signinTab.classList.add("active");
    signupTab.classList.remove("active");

    signinForm.classList.add("active-form");
    signupForm.classList.remove("active-form");

};

signupTab.onclick = () => {

    signupTab.classList.add("active");
    signinTab.classList.remove("active");

    signupForm.classList.add("active-form");
    signinForm.classList.remove("active-form");

};

// ==============================
// Password Toggle
// ==============================

function togglePassword(inputId, buttonId){

    const input=document.getElementById(inputId);

    const button=document.getElementById(buttonId);

    if(!input || !button) return;

    button.onclick=()=>{

        if(input.type==="password"){

            input.type="text";

            button.innerHTML='<i class="fa-solid fa-eye-slash"></i>';

        }

        else{

            input.type="password";

            button.innerHTML='<i class="fa-solid fa-eye"></i>';

        }

    }

}

togglePassword("password","togglePassword");
togglePassword("signupPassword","toggleSignupPassword");
togglePassword("confirmPassword","toggleConfirmPassword");

// ==============================
// Validation
// ==============================

signinForm.addEventListener("submit",(e)=>{

    e.preventDefault();

    const email=document.getElementById("loginEmail").value.trim();

    const pass=document.getElementById("password").value.trim();

    if(email==="" || pass===""){

        alert("Please enter Email and Password.");

        return;

    }

    alert("Login Successful!");

    window.location.href="workspace.html";

});

signupForm.addEventListener("submit",(e)=>{

    e.preventDefault();

    const name=document.getElementById("fullName").value.trim();

    const email=document.getElementById("signupEmail").value.trim();

    const mobile=document.getElementById("mobile").value.trim();

    const pass=document.getElementById("signupPassword").value;

    const confirm=document.getElementById("confirmPassword").value;

    if(name==="" || email==="" || mobile===""){

        alert("Please fill all fields.");

        return;

    }

    if(pass!==confirm){

        alert("Passwords do not match.");

        return;

    }

    alert("Account Created Successfully!");

    window.location.href="workspace.html";

});