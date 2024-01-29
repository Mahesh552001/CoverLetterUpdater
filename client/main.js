const { Session } = require("inspector");
const { debug } = require("util");

function showProfile() {
  catalyst.auth
    .isUserAuthenticated()
    .then(async (result) => {
      document.getElementById("content").innerHTML =
        "Hi " + result.content.first_name + ", welcome!";

      sessionStorage.setItem("email", result.content.email_id);

      const response = await fetch(
        `/server/coverletterupdater/fetch?email=${result.content.email_id}`
      );

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length === 0) {
        document.getElementById("uploadContent").style.display = "block";
        document.getElementById("updateContent").style.display = "none";
        document.getElementById("coverLetterInputForm").style.display = "none";
      } else {
        document.getElementById("uploadContent").style.display = "none";
        document.getElementById("updateContent").style.display = "block";
        document.getElementById("coverLetterInputForm").style.display = "unset";
      }
      document.body.style.visibility = "visible";
    })
    .catch((err) => {
      document.body.style.visibility = "visible";
      document.body.innerHTML =
        "You are not logged in. Please log in to continue. Redirecting you to the login page..";
      setTimeout(function () {
        window.location.href = "/__catalyst/auth/login";
      }, 5000);
    });
}

function logout() {
  const redirectURL =
    location.protocol + "//" + location.hostname + "/__catalyst/auth/login";
  catalyst.auth.signOut(redirectURL);
}

async function uploadFile() {
  const fileInput = document.getElementById("uploadFileInput");

  if (fileInput.files.length <= 0) {
    alert("Please select a file.");
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);
  formData.append("email", sessionStorage.getItem("email"));

  try {
    const response = await fetch(`/server/coverletterupdater/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("File upload failed");
    }
    location.reload();
    alert("File uploaded successfully!");
  } catch (error) {
    alert("Sorry! Currently can't able to upload file.");
    console.error("File upload error:", error);
  } finally {
    fileInput.value = "";
    document.getElementById("uploadButton").style.display = "none";
  }
}

async function updateFile() {
  const fileInput = document.getElementById("updateFileInput");

  if (fileInput.files.length <= 0) {
    alert("Please select a file.");
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);
  formData.append("email", sessionStorage.getItem("email"));

  try {
    const response = await fetch(`/server/coverletterupdater/update`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("File update failed");
    }
    alert("File updated successfully!");
  } catch (error) {
    alert("Sorry! Currently can't able to update file.");
    console.error("File update error:", error);
  } finally {
    fileInput.value = "";
    document.getElementById("updateButton").style.display = "none";
  }
}

function handleFileSelect() {
  const uploadFileInput = document.getElementById("uploadFileInput");
  const updateFileInput = document.getElementById("updateFileInput");

  let fileInput;
  let button;
  if (uploadFileInput.files.length > 0) {
    fileInput = uploadFileInput;
    button = document.getElementById("uploadButton");
  } else if (updateFileInput.files.length > 0) {
    fileInput = updateFileInput;
    button = document.getElementById("updateButton");
  }

  if (fileInput.files.length > 0) {
    button.style.display = "unset";
  } else {
    button.style.display = "none";
  }
}

function submitCoverLetter() {
  const roleName = document.getElementById("roleName").value;
  const companyName = document.getElementById("companyName").value;
  const companyLocation = document.getElementById("companyLocation").value;
  const email = sessionStorage.getItem("email");

  const data = {
    roleName: roleName,
    companyName: companyName,
    companyLocation: companyLocation,
    email,
  };

  fetch(`/server/coverletterupdater/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("API request failed");
      }
      return response.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "modified_" + email + ".docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    })
    .catch((error) => {
      alert("Error generating the cover letter");
      console.error("API Request Error:", error);
    });
  const myForm = document.getElementById("coverLetterForm");
  myForm.reset();
}
