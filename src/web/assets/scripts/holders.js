/**
 * A procedure to filter lists from your input especially for holders list
 * @param {HTMLInputElement} ev
 * @param {string} containerId
 * @returns {void}
 */
function filterNonHolders(ev, containerId) {
  /** @type string */
  const input = ev.target.value;
  const container = document.getElementById(containerId);

  if (!container) {
    console.log("Container not found. Maybe someone changed your element?");
    return;
  }

  container.childNodes.forEach((cn) => {
    const context = cn.textContent.toLowerCase();
    if (!context.includes(input.trim().toLowerCase())) {
      cn.style.display = "none";
    } else {
      cn.style.display = "";
    }
  });
}

document.getElementById("input_non_holders")?.addEventListener("input", (ev) => filterNonHolders(ev, "non_holders"));
document.getElementById("input_holders")?.addEventListener("input", (ev) => filterNonHolders(ev, "holders"));
