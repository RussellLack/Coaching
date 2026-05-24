const feedbackForm = document.querySelector("#feedbackForm");
const feedbackStatus = document.querySelector("#feedbackStatus");

feedbackForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(feedbackForm);
  const summary = [
    data.get("offer"),
    data.get("scanPrice"),
    data.get("trigger"),
    `${data.get("confidence")}/5 confidence`,
    `${data.get("previewDepth")} preview`,
    `${data.get("proof")} proof`,
  ]
    .filter(Boolean)
    .join(" · ");

  feedbackStatus.textContent = `Captured for review: ${summary}`;
});
