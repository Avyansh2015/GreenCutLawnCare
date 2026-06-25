// ==========================================
// 1. FIREBASE SETUP (Put this at the very top)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXeGxGSOwIIw-IQjUCCBXzaBMckeUh64c",
  authDomain: "green-cut-lawn-care.firebaseapp.com",
  projectId: "green-cut-lawn-care",
  storageBucket: "green-cut-lawn-care.firebasestorage.app",
  messagingSenderId: "324723829626",
  appId: "1:324723829626:web:26e5c09726f27826e744c3",
  measurementId: "G-JE2ZX4NC5S"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const bookedSlotsDocRef = doc(db, "bookings", "unavailableSlots");

let globalBookedSlots = [];

// ==========================================
// 2. YOUR ORIGINAL LOGIC (With Firebase Hooks)
// ==========================================
document.addEventListener("DOMContentLoaded", function () {

  const buttons = document.querySelectorAll(".card button");
  const cartItems = document.getElementById("cartItems");
  const totalDisplay = document.querySelector(".total");

  let total = 0;

  function updateTotal() {
    totalDisplay.textContent = `Total: $${total}`;
  }

  // Live database checker: instantly disables slot buttons if they are booked out
  onSnapshot(bookedSlotsDocRef, (snapshot) => {
    globalBookedSlots = snapshot.exists() ? (snapshot.data().slots || []) : [];
    
    buttons.forEach((button) => {
      const card = button.parentElement;
      const title = card.querySelector("h3").textContent.trim();
      
      if (globalBookedSlots.includes(title)) {
        button.textContent = "Booked Out";
        button.disabled = true;
        button.style.background = "#555";
        button.style.cursor = "not-allowed";
      }
    });
  });

  buttons.forEach((button) => {
    button.addEventListener("click", function () {

      const card = button.parentElement;

      const title = card.querySelector("h3").textContent;
      const priceText = card.querySelector(".price").textContent;
      const price = parseFloat(priceText.replace("$", ""));

      const li = document.createElement("li");

      const text = document.createElement("span");
      text.textContent = `${title} - $${price}`;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";

      removeBtn.style.marginLeft = "10px";
      removeBtn.style.background = "#c62828";
      removeBtn.style.color = "white";
      removeBtn.style.border = "none";
      removeBtn.style.padding = "4px 8px";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.borderRadius = "5px";

      removeBtn.addEventListener("click", function () {
        li.remove();
        total -= price;
        updateTotal();
      });

      li.appendChild(text);
      li.appendChild(removeBtn);

      cartItems.appendChild(li);

      total += price;
      updateTotal();

      button.textContent = "Added!";
      button.disabled = true;

      setTimeout(() => {
        // Only reset text if it hasn't been globally booked out in the meantime
        if (!globalBookedSlots.includes(title.trim())) {
          button.textContent = "Add Appointment";
          button.disabled = false;
        }
      }, 1000);
    });
  });

  updateTotal();

  const form = document.querySelector(".form-box form");

  if (form) {
    form.addEventListener("submit", async function (event) {
      // 1. Gather all selections for Formspree email
      const items = document.querySelectorAll("#cartItems li");
      let appointments = [];

      items.forEach(item => {
        const span = item.querySelector("span");
        if (span) {
          appointments.push(span.textContent.trim());
        }
      });

      const appointmentsField = document.getElementById("appointmentsField");
      const totalField = document.getElementById("totalField");

      if (appointmentsField) {
        appointmentsField.value = appointments.join(" | ");
      }

      if (totalField) {
        totalField.value = totalDisplay.textContent;
      }

      // 2. Push selections to Firebase to book them out permanently
      if (appointments.length > 0) {
        event.preventDefault(); // Pause Formspree submit momentarily

        // Isolate just the day and time text (e.g., "Saturday 8:00 AM")
        const newBookings = appointments.map(str => str.split(" - ")[0].trim());
        const updatedTotalSlots = [...new Set([...globalBookedSlots, ...newBookings])];

        try {
          await setDoc(bookedSlotsDocRef, { slots: updatedTotalSlots }, { merge: true });
          form.submit(); // Database updated successfully! Now send Formspree mail
        } catch (error) {
          console.error("Firebase Error: ", error);
          form.submit(); // Fallback to make sure form sends anyway if DB lags
        }
      }
    });
  }
});