// ==========================================
// 1. FIREBASE SETUP
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDXeGxGSOwIIw-IQjUCCBXzaBMckeUh64c",
  authDomain: "green-cut-lawn-care.firebaseapp.com",
  projectId: "green-cut-lawn-care",
  storageBucket: "green-cut-lawn-care.firebasestorage.app",
  messagingSenderId: "324723829626",
  appId: "1:324723829626:web:26e5c09726f27826e744c3",
  measurementId: "G-JE2ZX4NC5S"
};

let db = null;
let bookedSlotsDocRef = null;
let firebaseReady = false;
let firebaseError = null;

async function initializeFirebase() {
  try {
    const [{ initializeApp }, { getFirestore, doc, setDoc, onSnapshot }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js")
    ]);

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    bookedSlotsDocRef = doc(db, "bookings", "unavailableSlots");
    firebaseReady = true;

    return { setDoc, onSnapshot };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    firebaseError = error;
    return null;
  }
}

const firebaseInitPromise = initializeFirebase();
const STORAGE_KEY = "greenCutBookedSlots";
let globalBookedSlots = [];

// ==========================================
// 2. BOOKING LOGIC
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
  const buttons = document.querySelectorAll(".card button");
  const cartItems = document.getElementById("cartItems");
  const totalDisplay = document.querySelector(".total");

  let total = 0;

  function updateTotal() {
    if (totalDisplay) {
      totalDisplay.textContent = `Total: $${total}`;
    }
  }

  function loadLocalBookedSlots() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        globalBookedSlots = JSON.parse(saved);
      }
    } catch (error) {
      console.error("Could not read saved bookings:", error);
      globalBookedSlots = [];
    }
  }

  function saveLocalBookedSlots() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalBookedSlots));
  }

  function updateButtonStates() {
    buttons.forEach((button) => {
      const card = button.parentElement;
      const title = card?.querySelector("h3")?.textContent?.trim() || "";

      if (globalBookedSlots.includes(title)) {
        button.textContent = "Booked Out";
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

  loadLocalBookedSlots();
  updateButtonStates();

  firebaseInitPromise.then((firebaseModules) => {
    if (firebaseModules && bookedSlotsDocRef) {
      const { onSnapshot } = firebaseModules;
      onSnapshot(
        bookedSlotsDocRef,
        (snapshot) => {
          const remoteSlots = snapshot.exists() ? (snapshot.data().slots || []) : [];
          globalBookedSlots = [...new Set([...globalBookedSlots, ...remoteSlots])];
          saveLocalBookedSlots();
          updateButtonStates();
        },
        (error) => {
          console.error("Firestore listener failed:", error);
          firebaseReady = false;
          updateButtonStates();
        }
      );
    }
  });

  buttons.forEach((button) => {
    button.addEventListener("click", async function () {
      const card = button.parentElement;
      const title = card?.querySelector("h3")?.textContent?.trim() || "";
      const priceText = card?.querySelector(".price")?.textContent || "$0";
      const price = parseFloat(priceText.replace("$", ""));

      if (!title) return;

      if (globalBookedSlots.includes(title)) {
        return;
      }

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

      globalBookedSlots.push(title);
      saveLocalBookedSlots();
      updateButtonStates();

      const firebaseModules = await firebaseInitPromise;
      if (firebaseModules && bookedSlotsDocRef) {
        try {
          await firebaseModules.setDoc(bookedSlotsDocRef, { slots: [...new Set(globalBookedSlots)] }, { merge: true });
        } catch (error) {
          console.error("Firebase save failed:", error);
          firebaseReady = false;
          updateButtonStates();
        }
      }
    });
  });

  updateTotal();

  const form = document.querySelector(".form-box form");

  if (form) {
    form.addEventListener("submit", async function (event) {
      const items = document.querySelectorAll("#cartItems li");
      const appointments = [];

      items.forEach((item) => {
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

      if (appointments.length > 0) {
        event.preventDefault();

        const newBookings = appointments.map((str) => str.split(" - ")[0].trim());
        globalBookedSlots = [...new Set([...globalBookedSlots, ...newBookings])];
        saveLocalBookedSlots();
        updateButtonStates();

        const firebaseModules = await firebaseInitPromise;
        if (firebaseModules && bookedSlotsDocRef) {
          try {
            await firebaseModules.setDoc(bookedSlotsDocRef, { slots: globalBookedSlots }, { merge: true });
          } catch (error) {
            console.error("Firebase booking save failed:", error);
            firebaseReady = false;
          }
        }

        form.submit();
      }
    });
  }
});