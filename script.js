document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".card button");
  const cartItems = document.getElementById("cartItems");
  const totalDisplay = document.querySelector(".total");
  const form = document.querySelector(".form-box form");

  const storageKey = "greenCutAppointments";
  let selectedAppointments = [];
  let total = 0;

  function saveAppointments() {
    localStorage.setItem(storageKey, JSON.stringify(selectedAppointments));
  }

  function loadAppointments() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        selectedAppointments = JSON.parse(saved);
      }
    } catch (error) {
      console.error("Could not load saved appointments:", error);
      selectedAppointments = [];
    }
  }

  function updateTotal() {
    total = selectedAppointments.reduce((sum, item) => sum + item.price, 0);
    if (totalDisplay) {
      totalDisplay.textContent = `Total: $${total}`;
    }
  }

  function renderCart() {
    if (!cartItems) return;

    cartItems.innerHTML = "";

    if (selectedAppointments.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.textContent = "No appointments selected yet.";
      cartItems.appendChild(emptyItem);
    } else {
      selectedAppointments.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${item.title} - $${item.price}</span>`;

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.style.marginLeft = "10px";
        removeBtn.style.background = "#c62828";
        removeBtn.style.color = "white";
        removeBtn.style.border = "none";
        removeBtn.style.padding = "4px 8px";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.borderRadius = "5px";

        removeBtn.addEventListener("click", () => {
          selectedAppointments = selectedAppointments.filter((entry) => entry.title !== item.title);
          saveAppointments();
          renderCart();
          updateButtonStates();
        });

        li.appendChild(removeBtn);
        cartItems.appendChild(li);
      });
    }

    updateTotal();
    updateHiddenFields();
  }

  function updateButtonStates() {
    buttons.forEach((button) => {
      const card = button.closest(".card");
      const title = card?.querySelector("h3")?.textContent?.trim() || "";
      const added = selectedAppointments.some((entry) => entry.title === title);

      if (added) {
        button.textContent = "Added";
        button.disabled = true;
        button.style.background = "#555";
        button.style.cursor = "not-allowed";
      } else {
        button.textContent = "Add Appointment";
        button.disabled = false;
        button.style.background = "";
        button.style.cursor = "pointer";
      }
    });
  }

  function updateHiddenFields() {
    const appointmentsField = document.getElementById("appointmentsField");
    const totalField = document.getElementById("totalField");

    if (appointmentsField) {
      appointmentsField.value = selectedAppointments.map((item) => `${item.title} - $${item.price}`).join(" | ");
    }

    if (totalField) {
      totalField.value = `$${total}`;
    }
  }

  loadAppointments();
  updateButtonStates();
  renderCart();

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".card");
      const title = card?.querySelector("h3")?.textContent?.trim() || "";
      const priceText = card?.querySelector(".price")?.textContent || "$0";
      const price = Number(priceText.replace("$", ""));

      if (!title || selectedAppointments.some((entry) => entry.title === title)) {
        return;
      }

      selectedAppointments.push({ title, price });
      saveAppointments();
      renderCart();
      updateButtonStates();
    });
  });

  if (form) {
    form.addEventListener("submit", () => {
      updateHiddenFields();
    });
  }
});