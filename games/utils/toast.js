export function addToast(text) {
  let toast = document.createElement("div");
  toast.classList.add("addToast-toast");
  toast.id = "toast";
  document.body.appendChild(toast);
  toast.style.position = "fixed";
  toast.style.top = "12px";
  toast.style.left = "12px";
  toast.style.right = "12px";
  toast.style.zIndex = "100";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.justifyContent = "space-between";
  toast.style.padding = "6px";
  toast.style.borderRadius = "12px";
  toast.style.backgroundColor = "white";
  toast.style.boxShadow = "0 0 12px rgba(0, 0, 0, 0.1)";

  let textNode = document.createElement("p");
  textNode.textContent = text;

  let closeButton = document.createElement("button");
  let xIcon = document.createElement("img");
  xIcon.src = "https://esm.sh/feather-icons@4.29.1/dist/icons/x.svg";
  closeButton.appendChild(xIcon);
  closeButton.onclick = () => {
    toast.remove();
  };

  setTimeout(() => {
    toast.remove();
  }, 3000);

  toast.append(textNode, closeButton);
}
