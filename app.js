const DATA_ENDPOINT = "https://dummyjson.com/c/a66d-ab89-4f6b-9289";
const PRODUCT_ENDPOINT = "https://dummyjson.com/products?limit=3";

const state = {
  flow: null,
  orders: [],
  ordersLoaded: false,
  verification: {
    name: "",
    email: "",
    address: "",
    verified: false,
  },
  customer: null,
  customerOrders: [],
  escalated: false,
  escalation: {
    phone: "",
    availability: "",
  },
  awaitingField: null,
  onboarding: {
    active: false,
    step: 0,
    responses: [],
    questions: [
      "How would you rate your first week with us (1-5)?",
      "What was the biggest obstacle during setup?",
      "Which feature felt most valuable right away?",
      "What could we do to make onboarding smoother?",
    ],
  },
};

const chatWindow = document.getElementById("chatWindow");
const quickActions = document.getElementById("quickActions");
const userInput = document.getElementById("userInput");
const chatForm = document.getElementById("chatForm");

const OPENAI_API_KEY = window.__ENV__ && window.__ENV__.OPENAI_API_KEY;
const OPENAI_MODEL = (window.__ENV__ && window.__ENV__.OPENAI_MODEL) || "gpt-4o-mini";

// Toggle quick action button visibility.
function setButtonsVisible(isVisible) {
  if (!quickActions) return;
  quickActions.classList.toggle("hidden", !isVisible);
}

// Append a new chat message to the window.
function appendMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = text;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Add a bot message to the chat.
function pushBotMessage(text) {
  appendMessage("bot", text);
}

// Add a user message to the chat.
function pushUserMessage(text) {
  appendMessage("user", text);
}

// Normalize strings for reliable comparisons.
function normalizeValue(value) {
  return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Convert API order dates into readable text.
function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

// Extract an email address from free-form text.
function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

// Fetch orders from the authoritative DummyJSON endpoint.
async function fetchOrdersFromApi() {
  if (state.ordersLoaded) {
    return state.orders;
  }

  const response = await fetch(DATA_ENDPOINT);
  if (!response.ok) {
    throw new Error("Customer data request failed.");
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.orders)) {
    throw new Error("Customer data is missing or malformed.");
  }

  state.orders = data.orders;
  state.ordersLoaded = true;
  return state.orders;
}

// Find a customer record that matches name, email, and address.
function findCustomerMatch(orders, name, email, address) {
  const normalizedName = normalizeValue(name);
  const normalizedEmail = normalizeValue(email);
  const normalizedAddress = normalizeValue(address);

  return orders.find((order) => {
    const orderName = normalizeValue(order.customerName);
    const orderEmail = normalizeValue(order.customerEmail);
    const orderAddress = normalizeValue(order.shippingAddress?.street);
    return orderName === normalizedName && orderEmail === normalizedEmail && orderAddress === normalizedAddress;
  });
}

// Return the latest order for the verified customer.
function getLatestOrder(orders) {
  if (!orders.length) return null;
  return [...orders].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))[0];
}

// Determine the intended flow from free-form text.
function detectFlowFromText(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes("order") || normalized.includes("tracking")) return "order_status";
  if (normalized.includes("cancel") || normalized.includes("refund")) return "cancel_refund";
  if (normalized.includes("upgrade") || normalized.includes("recommend") || normalized.includes("upsell")) return "upsell";
  if (normalized.includes("billing") || normalized.includes("invoice") || normalized.includes("card")) return "billing_issue";
  if (normalized.includes("onboard") || normalized.includes("feedback")) return "onboarding_feedback";
  return "";
}

// Start a customer flow and prompt for verification.
function startFlow(flow) {
  state.flow = flow;
  setButtonsVisible(false);
  if (!state.verification.verified) {
    askForVerificationField("name");
    return;
  }
  pushBotMessage(`Great. Let's continue with ${flow.replace("_", " ")}.`);
}

// Ask the next verification question in the required order.
function askForVerificationField(field) {
  state.awaitingField = field;
  if (field === "name") {
    pushBotMessage("Before we begin, please share your full name.");
  } else if (field === "email") {
    pushBotMessage("Thanks. What is your email address?");
  } else if (field === "address") {
    pushBotMessage("Lastly, what is the first line of your address?");
  }
}

// Verify the customer data against the API source of truth.
async function verifyCustomer() {
  const orders = await fetchOrdersFromApi();
  if (!orders.length) {
    throw new Error("No customer records were returned.");
  }

  const match = findCustomerMatch(
    orders,
    state.verification.name,
    state.verification.email,
    state.verification.address
  );

  if (!match) {
    return false;
  }

  state.customer = {
    id: match.customerId,
    name: match.customerName,
    email: match.customerEmail,
    address: match.shippingAddress?.street || "",
  };
  state.customerOrders = orders.filter((order) => order.customerId === match.customerId);
  state.verification.verified = true;
  return true;
}

// Escalate to a human agent and capture follow-up details.
function escalateToHuman() {
  state.escalated = true;
  pushBotMessage(
    "Verification failed. A human agent will call you within two business days. " +
      "Please share a phone number and your availability."
  );
}

// Handle the escalation info collection and stop automation.
function handleEscalationMessage(text) {
  if (!state.escalation.phone) {
    state.escalation.phone = text.trim();
    pushBotMessage("Thanks. What days or times are you available?");
    return;
  }

  if (!state.escalation.availability) {
    state.escalation.availability = text.trim();
    pushBotMessage("Thank you. A human agent will reach out. Automated support is now paused.");
    return;
  }

  pushBotMessage("A human agent will reach out soon. Automated support remains paused.");
}

// Call OpenAI only when a natural language response is needed.
async function callOpenAI(messages) {
  if (!OPENAI_API_KEY) {
    return "";
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed.");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Complete the current flow and return to the menu.
function completeFlow() {
  state.flow = null;
  state.onboarding.active = false;
  state.onboarding.step = 0;
  state.onboarding.responses = [];
  setButtonsVisible(true);
  pushBotMessage("Is there anything else I can help you with?");
}

// Provide order status and tracking details.
function handleOrderStatusFlow() {
  const latest = getLatestOrder(state.customerOrders);
  if (!latest) {
    throw new Error("No orders found for this customer.");
  }

  const trackingLine = latest.trackingNumber
    ? `Tracking ${latest.trackingNumber} via ${latest.carrier || "carrier"}.`
    : "Tracking is not yet available.";
  const eta = latest.estimatedDelivery ? `Estimated delivery ${formatDate(latest.estimatedDelivery)}.` : "";
  pushBotMessage(
    `Order ${latest.orderId} is ${latest.status.replace(/_/g, " ")}. ${trackingLine} ${eta}`.trim()
  );
  completeFlow();
}

// Provide cancellation or refund guidance for the latest order.
function handleCancellationFlow() {
  const latest = getLatestOrder(state.customerOrders);
  if (!latest) {
    throw new Error("No orders found for this customer.");
  }

  if (latest.status === "cancelled") {
    const refundLine = latest.refundStatus
      ? `Refund status: ${latest.refundStatus}. Amount: $${latest.refundAmount}.`
      : "Refund is not listed for this order.";
    pushBotMessage(`Order ${latest.orderId} is already cancelled. ${refundLine}`);
    completeFlow();
    return;
  }

  if (latest.status === "pending_refund") {
    const eta = latest.estimatedRefundDate ? formatDate(latest.estimatedRefundDate) : "";
    pushBotMessage(
      `Order ${latest.orderId} is pending refund. Estimated refund date: ${eta || "not available"}.`
    );
    completeFlow();
    return;
  }

  pushBotMessage(
    `Order ${latest.orderId} is currently ${latest.status.replace(/_/g, " ")}. ` +
      "To request a cancellation or refund, a specialist must review the order. " +
      "Reply if you want me to escalate this request."
  );
  completeFlow();
}

// Provide billing or payment issue guidance from the latest order.
function handleBillingIssueFlow() {
  const latest = getLatestOrder(state.customerOrders);
  if (!latest) {
    throw new Error("No orders found for this customer.");
  }

  const paymentStatus = latest.paymentMethod || "Payment method not listed";
  const paymentError = latest.paymentError ? `Latest error: ${latest.paymentError}.` : "";
  pushBotMessage(
    `Billing details for order ${latest.orderId}: ${paymentStatus}. ${paymentError}`.trim()
  );
  completeFlow();
}

// Recommend products using the public catalog endpoint.
async function handleUpsellFlow() {
  const response = await fetch(PRODUCT_ENDPOINT);
  if (!response.ok) {
    throw new Error("Product catalog request failed.");
  }

  const data = await response.json();
  const items = Array.isArray(data.products) ? data.products : [];
  if (!items.length) {
    throw new Error("Product catalog is empty.");
  }

  const list = items.map((item) => `${item.title} ($${item.price})`).join(", ");
  pushBotMessage(`Here are a few recommendations: ${list}.`);
  completeFlow();
}

// Run the onboarding feedback questionnaire.
async function handleOnboardingFlow(text) {
  if (!state.onboarding.active) {
    state.onboarding.active = true;
    state.onboarding.step = 0;
    state.onboarding.responses = [];
    pushBotMessage("Thanks. I will ask a few quick onboarding questions.");
  }

  if (state.onboarding.step > 0) {
    state.onboarding.responses.push(text);
  }

  const nextQuestion = state.onboarding.questions[state.onboarding.step];
  if (nextQuestion) {
    state.onboarding.step += 1;
    pushBotMessage(nextQuestion);
    return;
  }

  let closingMessage = "Thanks for the feedback. I will share this with the onboarding team.";
  try {
    const response = await callOpenAI([
      {
        role: "system",
        content: "Summarize the onboarding feedback in one sentence for an internal CS note.",
      },
      { role: "user", content: state.onboarding.responses.join(" ") },
    ]);
    if (response) {
      closingMessage = `Thanks for the feedback. Internal summary: ${response}`;
    }
  } catch (error) {
    closingMessage = "Thanks for the feedback. I will share this with the onboarding team.";
  }

  pushBotMessage(closingMessage);
  completeFlow();
}

// Collect verification info before accessing any account data.
async function handleVerification(text) {
  if (state.verification.verified) {
    return true;
  }

  if (!state.awaitingField) {
    askForVerificationField("name");
    return false;
  }

  if (state.awaitingField === "name") {
    state.verification.name = text.trim();
    if (!state.verification.name) {
      pushBotMessage("Please provide your full name.");
      return false;
    }
    askForVerificationField("email");
    return false;
  }

  if (state.awaitingField === "email") {
    const email = extractEmail(text);
    if (!email) {
      pushBotMessage("Please provide a valid email address.");
      return false;
    }
    state.verification.email = email;
    askForVerificationField("address");
    return false;
  }

  if (state.awaitingField === "address") {
    state.verification.address = text.trim();
    if (!state.verification.address) {
      pushBotMessage("Please provide the first line of your address.");
      return false;
    }
    state.awaitingField = null;
  }

  try {
    const verified = await verifyCustomer();
    if (!verified) {
      escalateToHuman();
      return false;
    }
  } catch (error) {
    pushBotMessage("Customer data is missing or unavailable. Escalating to a human agent.");
    escalateToHuman();
    return false;
  }

  pushBotMessage("Thanks, your details are verified. How can I help with this request?");
  return true;
}

// Route a verified request to the selected flow.
async function handleFlow() {
  if (!state.flow) {
    return;
  }

  try {
    if (state.flow === "order_status") {
      handleOrderStatusFlow();
    } else if (state.flow === "cancel_refund") {
      handleCancellationFlow();
    } else if (state.flow === "billing_issue") {
      handleBillingIssueFlow();
    } else if (state.flow === "upsell") {
      await handleUpsellFlow();
    } else if (state.flow === "onboarding_feedback") {
      pushBotMessage(state.onboarding.questions[0]);
      state.onboarding.active = true;
      state.onboarding.step = 1;
    }
  } catch (error) {
    pushBotMessage(`Error: ${error.message}`);
    completeFlow();
  }
}

// Main message handler for user input.
async function handleUserMessage(text) {
  pushUserMessage(text);

  if (state.escalated) {
    handleEscalationMessage(text);
    return;
  }

  if (!state.flow) {
    const detectedFlow = detectFlowFromText(text);
    if (!detectedFlow) {
      pushBotMessage("Please choose one of the options below to get started.");
      return;
    }
    startFlow(detectedFlow);
    return;
  }

  if (state.flow === "onboarding_feedback" && state.onboarding.active) {
    await handleOnboardingFlow(text);
    return;
  }

  const verified = await handleVerification(text);
  if (!verified) {
    return;
  }

  await handleFlow();
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;
  userInput.value = "";
  handleUserMessage(text);
});

if (quickActions) {
  quickActions.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.escalated) {
        pushBotMessage("A human agent will reach out soon. Automated support remains paused.");
        return;
      }
      const flow = button.dataset.flow;
      if (!flow) return;
      startFlow(flow);
    });
  });
}

setButtonsVisible(true);
pushBotMessage("Welcome! Please choose how I can help you today.");
