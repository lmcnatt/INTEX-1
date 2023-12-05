function ShowPassword() {
    var x = document.getElementById(elementid);
    if (x.type === "password") {
        x.type = "text";
    } else {
        x.type = "password";
    }
}