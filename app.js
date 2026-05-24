const form = document.querySelector("#readinessAssessment");
const organisationRoles = document.querySelector("#organisationRoles");
const independentRoles = document.querySelector("#independentRoles");
const assessmentType = document.querySelector("#assessmentType");
const assessmentName = document.querySelector("#assessmentName");
const assessmentFocus = document.querySelector("#assessmentFocus");
const assessmentFear = document.querySelector("#assessmentFear");
const assessmentThemes = document.querySelector("#assessmentThemes");
const questionList = document.querySelector("#questionList");
const resultPanel = document.querySelector("#resultPanel");
const resultEmpty = resultPanel?.querySelector(".result-empty");
const resultFilled = resultPanel?.querySelector(".result-filled");
const resultTitle = document.querySelector("#resultTitle");
const resultCopy = document.querySelector("#resultCopy");
const resultObservations = document.querySelector("#resultObservations");
const resultTension = document.querySelector("#resultTension");
const resultRoute = document.querySelector("#resultRoute");
const reportLink = document.querySelector("#reportLink");
const previewSection = document.querySelector("#preview");
const previewHeadline = document.querySelector("#previewHeadline");
const previewBriefTitle = document.querySelector("#previewBriefTitle");
const previewExposed = document.querySelector("#previewExposed");
const previewDefensible = document.querySelector("#previewDefensible");
const previewBlindspot = document.querySelector("#previewBlindspot");

const archetypes = [
  {
    id: "direction-setter",
    group: "organisation",
    title: "The Direction Setter",
    assessment: "Strategic Future Navigation Assessment",
    focus: "Vision, positioning, prioritisation and strategic judgement.",
    roles: "CEO, Founder, Managing Director, Partner, Business Unit Lead",
    fear: "Am I steering towards the future, or defending the past?",
    themes: [
      "Strategic clarity",
      "AI opportunity recognition",
      "Decision quality",
      "Narrative leadership",
      "Long-term relevance",
    ],
    questions: [
      "I can describe how AI changes the future position of my organisation or practice.",
      "I can separate genuine AI opportunity from general market commentary.",
      "I make strategic decisions under uncertainty without defaulting to old models.",
      "I have a clear narrative that helps others understand why AI matters now.",
      "I know which legacy assumptions I need to challenge this year.",
      "I protect time for future-facing judgement, not just operational response.",
      "I can prioritise AI bets without spreading attention too thin.",
      "I feel my leadership relevance is expanding rather than narrowing.",
    ],
    brief: {
      exposed: "Strategic narrative that still reflects pre-AI assumptions about competitive advantage and team capacity.",
      defensible: "Judgement under uncertainty, board-level pattern recognition, and the authority to make sequencing decisions.",
      blindspot: "Acting on AI opportunity at the level of tooling rather than at the level of operating model.",
    },
  },
  {
    id: "operator",
    group: "organisation",
    title: "The Operator",
    assessment: "AI Workflow Orchestration Assessment",
    focus: "Execution, delivery, coordination and systems.",
    roles: "COO, Operations leader, Programme Director, Delivery lead",
    fear: "How will my role change if AI automates more coordination work?",
    themes: [
      "Workflow redesign",
      "Human-machine orchestration",
      "Delegation to AI",
      "Operational friction",
      "Cognitive overload",
    ],
    questions: [
      "I have mapped where AI can remove friction from delivery workflows.",
      "I know which coordination tasks should be delegated to AI support.",
      "I can redesign processes around human-machine handoffs.",
      "I can spot operational drag before it becomes leadership overload.",
      "I use AI to prepare, compare and track execution options.",
      "I have reduced meetings, status chasing or manual reporting with better systems.",
      "I know where human judgement must remain in the delivery chain.",
      "I can keep teams moving without becoming the coordination bottleneck.",
    ],
    brief: {
      exposed: "Coordination, status synthesis and first-pass scenario comparison — work that can be compressed by AI agents.",
      defensible: "Trade-off judgement, stakeholder trust, escalation calls and the design of the operating rhythm itself.",
      blindspot: "Adding AI tools without redesigning the meeting cadence and decision flow they feed into.",
    },
  },
  {
    id: "commercial-builder",
    group: "organisation",
    title: "The Commercial Builder",
    assessment: "AI Market Trust Assessment",
    focus: "Revenue, growth, influence and market trust.",
    roles: "CMO, Sales Director, Commercial lead, Business development leader",
    fear: "How do I stay valuable when AI can produce large volumes of content and outreach?",
    themes: [
      "Signal quality",
      "Trust creation",
      "Authority positioning",
      "Human differentiation",
      "AI-enhanced persuasion",
    ],
    questions: [
      "I can create market signal that feels human, specific and trusted.",
      "I know where AI improves persuasion and where it weakens credibility.",
      "I have a clear authority position that is not just more content.",
      "I can use AI to understand customer context before outreach.",
      "I can explain what makes my commercial judgement difficult to copy.",
      "I can turn expertise into sharper offers, messages or conversations.",
      "I have reduced standardised communication in favour of higher-trust signals.",
      "I can explain why buyers should trust me in a market with high volumes of AI-generated communication.",
    ],
    brief: {
      exposed: "Standardised outbound communication and any commercial signal that becomes indistinguishable from AI-generated volume.",
      defensible: "Authority, taste, judgement about which buyers are worth time, and the trust that lets a difficult conversation happen.",
      blindspot: "Using AI to produce more of the same signal, rather than to free time for the human work buyers respond to.",
    },
  },
  {
    id: "financial-guardian",
    group: "organisation",
    title: "The Financial Guardian",
    assessment: "AI Value and Risk Assessment",
    focus: "Risk, resource allocation, productivity and sustainability.",
    roles: "CFO, Finance lead, Procurement lead, Governance leader",
    fear: "How do I evaluate value when AI changes productivity itself?",
    themes: [
      "AI economics",
      "Productivity measurement",
      "Risk appetite",
      "Governance maturity",
      "Investment confidence",
    ],
    questions: [
      "I can evaluate AI investment beyond simple tool cost.",
      "I know how AI changes productivity, capacity and value creation.",
      "I can balance experimentation with sensible governance.",
      "I have clear criteria for approving or rejecting AI initiatives.",
      "I understand the risks of shadow AI use in my organisation.",
      "I can measure productivity improvement without relying on vanity metrics.",
      "I know where AI should reduce cost and where it should increase capability.",
      "I feel confident discussing AI value with both finance and non-finance leaders.",
    ],
    brief: {
      exposed: "Productivity and risk frameworks that still treat AI as a tool cost rather than as a change in capacity itself.",
      defensible: "Governance judgement, the ability to weigh slow risk against fast risk, and credibility with both finance and operating leaders.",
      blindspot: "Approving AI investment one initiative at a time, without a view of where capability should accumulate.",
    },
  },
  {
    id: "human-integrator",
    group: "organisation",
    title: "The Human Integrator",
    assessment: "AI Culture and Adaptation Assessment",
    focus: "Culture, people, capability and emotional adaptation.",
    roles: "HR leader, People Ops, Team leader, Department head, Senior mentor",
    fear: "How do people stay motivated and healthy during continuous AI-related change?",
    themes: [
      "Identity transition",
      "Team anxiety",
      "Trust and morale",
      "Human relevance",
      "Leadership communication",
    ],
    questions: [
      "I can recognise when AI-related anxiety appears as resistance or disengagement.",
      "I help people connect AI change to identity, growth and relevance.",
      "I can communicate AI adoption without making people feel replaceable.",
      "I know which capabilities my team must build next.",
      "I create space for honest conversations about concern, motivation and trust.",
      "I can use AI to support development without dehumanising the work.",
      "I can help leaders model curiosity instead of threat response.",
      "I can keep morale stable while expectations and tools keep changing.",
    ],
    brief: {
      exposed: "Standard messaging about AI adoption that does not address what people are quietly worried about.",
      defensible: "Reading the room, naming what is unsaid, and creating the conditions under which capability change actually happens.",
      blindspot: "Communicating about AI in change-management terms while the underlying identity questions remain unaddressed.",
    },
  },
  {
    id: "expert",
    group: "independent",
    title: "The Expert",
    assessment: "Expertise Defensibility Assessment",
    focus: "Knowledge, insight, specialist capability and intellectual positioning.",
    roles: "Consultant, strategist, advisor, architect, analyst",
    fear: "How does my value change when AI can reproduce much of what I know?",
    themes: [
      "Expertise defensibility",
      "AI leverage",
      "Intellectual positioning",
      "Personal differentiation",
      "Trust authority",
    ],
    questions: [
      "I know which parts of my expertise are now easy for AI to imitate.",
      "I can explain the judgement, taste or context that makes my advice valuable.",
      "I use AI to extend my thinking rather than simply speed up output.",
      "I have a clear intellectual position clients associate with me.",
      "I can convert deep knowledge into frameworks, decisions or navigation tools.",
      "I know where trust is built through human discernment, not information quantity.",
      "I have adjusted my offer so clients buy judgement, not just knowledge.",
      "I feel more differentiated as AI becomes more capable.",
    ],
    brief: {
      exposed: "Knowledge work that returns information rather than judgement — the parts of the offer AI can plausibly imitate.",
      defensible: "Intellectual position, taste, the context only an experienced practitioner notices, and the trust to be told the difficult thing.",
      blindspot: "Selling expertise by depth rather than by judgement, so clients keep paying for what AI now does cheaply.",
    },
  },
  {
    id: "builder",
    group: "independent",
    title: "The Builder",
    assessment: "AI Craft and Productivity Assessment",
    focus: "Delivery, execution, production and implementation.",
    roles: "Freelancer, creative, developer, producer, operator",
    fear: "Will AI make my craft easier to commoditise?",
    themes: [
      "Workflow redesign",
      "AI tooling maturity",
      "Productivity leverage",
      "Pricing evolution",
      "Human value",
    ],
    questions: [
      "I have redesigned my delivery workflow around strong AI tooling.",
      "I know which parts of my craft should become faster, cheaper or more automated.",
      "I can still identify where human taste, quality and accountability matter.",
      "I have changed pricing or packaging to reflect AI-enabled productivity.",
      "I use AI to increase quality, not just output volume.",
      "I can explain my human value to clients without sounding defensive.",
      "I have reduced low-value production work in favour of higher-value execution.",
      "I feel my craft is becoming more valuable, not easier to commoditise.",
    ],
    brief: {
      exposed: "Production work that AI-enabled competitors can now deliver faster, including parts of the craft that used to justify the rate.",
      defensible: "Taste, quality judgement, accountability for the final piece, and the relationship that lets a client trust the work.",
      blindspot: "Holding the old pricing model while AI quietly reframes what clients believe the work should cost.",
    },
  },
  {
    id: "network-orchestrator",
    group: "independent",
    title: "The Network Orchestrator",
    assessment: "Trust Network Navigation Assessment",
    focus: "Relationships, access, coordination, reputation and trust ecosystems.",
    roles: "Fractional executive, connector, agency founder, independent advisor",
    fear: "How do I remain valuable when AI reduces information asymmetry?",
    themes: [
      "Social capital",
      "Trust networks",
      "Signal creation",
      "Strategic coordination",
      "Human influence",
    ],
    questions: [
      "I can create trust between people, not just move information between them.",
      "I know which relationships become more valuable as AI reduces information gaps.",
      "I use AI to prepare context before important introductions or decisions.",
      "I can turn network insight into strategic coordination.",
      "I have a clear reputation signal that travels beyond my immediate contacts.",
      "I know where my human judgement makes relationships safer or more productive.",
      "I can coordinate multiple stakeholders without becoming a manual messenger.",
      "I feel my network role is becoming more strategic, not less necessary.",
    ],
    brief: {
      exposed: "Information-brokering and introduction-making that AI now compresses, including parts of the network role that used to feel essential.",
      defensible: "Discretion, judgement about which connections matter, the timing of an introduction, and the quiet authority to make one.",
      blindspot: "Treating the network as a contact list rather than as a slowly built trust position that AI cannot replicate.",
    },
  },
];

const profiles = [
  {
    min: 0,
    label: "Position not yet defined",
    copy:
      "The snapshot reads as someone who can see AI changing expectations but has not yet found the language, frame or method to act on it inside their own role.",
    route: "Awareness & Purpose",
    tension: "Whether the hesitation is genuinely about clarity, or whether it is a quieter question about identity that has not been spoken yet.",
  },
  {
    min: 21,
    label: "Exposed but adapting",
    copy:
      "The snapshot reads as someone with instinctive moves and some AI-supported practice in place, but with a value model that has not yet been deliberately redesigned around what is now possible.",
    route: "Workflow & Delegation",
    tension: "Whether the next move is to add more AI, or to redesign the operating rhythm AI now sits inside.",
  },
  {
    min: 31,
    label: "Defensible position with gaps",
    copy:
      "The snapshot reads as someone whose future value is becoming clearer, with the work now being to make that judgement, those tools and that positioning explicit enough to use consistently and to teach to others.",
    route: "Integration & Mastery",
    tension: "Whether the remaining gap is one of practice, or one of how the work is being described to clients, boards or teams.",
  },
];

const choicePrompts = {
  reaction: {
    label: "When I think about AI changing my work, my private response is closest to...",
    options: ["Energised", "Curious", "Unprepared", "Cautious", "Unclear"],
  },
  risk: {
    label: "The area I most need to manage over the next 12 months is...",
    options: [
      "Moving too slowly",
      "Becoming less distinctive",
      "Losing trust",
      "Becoming overextended",
      "Unclear economics",
    ],
  },
  protect: {
    label: "The value I most need to protect is...",
    options: ["Judgement", "Craft", "Network", "Leadership presence", "Commercial trust"],
  },
};

let selectedArchetype = archetypes[0];

function createRoleButton(archetype) {
  const button = document.createElement("button");
  button.className = "role-card";
  button.type = "button";
  button.dataset.role = archetype.id;
  button.setAttribute(
    "aria-label",
    `${archetype.title}. Usually: ${archetype.roles}.`,
  );
  const shortRoles = archetype.roles.split(", ").slice(0, 3).join(" / ");
  button.innerHTML = `
    <span>${archetype.title}</span>
    <small>${shortRoles}</small>
  `;
  button.addEventListener("click", () => selectArchetype(archetype.id));
  return button;
}

function renderRoleCards() {
  archetypes.forEach((archetype) => {
    const target =
      archetype.group === "organisation" ? organisationRoles : independentRoles;
    target.appendChild(createRoleButton(archetype));
  });
}

function renderQuestions(archetype) {
  const snapshotQuestions = [
    {
      type: "choice",
      name: "exposure",
      label: "The part of my professional value most affected by AI is...",
      options: archetype.themes,
    },
    {
      type: "choice",
      name: "reaction",
      label: choicePrompts.reaction.label,
      options: choicePrompts.reaction.options,
    },
    {
      type: "scale",
      label: "AI is already changing what people expect from someone in my role.",
    },
    {
      type: "scale",
      label: archetype.questions[0],
    },
    {
      type: "scale",
      label: "Some of the value I have traditionally offered is becoming easier to reproduce.",
    },
    {
      type: "scale",
      label: archetype.questions[1],
    },
    {
      type: "choice",
      name: "risk",
      label: choicePrompts.risk.label,
      options: choicePrompts.risk.options,
    },
    {
      type: "scale",
      label: archetype.questions[3],
    },
    {
      type: "scale",
      label: "I know what should be automated, augmented, protected or treated as high-value human work.",
    },
    {
      type: "choice",
      name: "protect",
      label: choicePrompts.protect.label,
      options: choicePrompts.protect.options,
    },
    {
      type: "scale",
      label: archetype.questions[6],
    },
    {
      type: "scale",
      label: "The next evolution of my work is clear enough to act on in the next 30 days.",
    },
  ];

  let scaleIndex = 0;

  questionList.innerHTML = snapshotQuestions
    .map((question, index) => {
      const scaleName =
        question.type === "scale" ? `q${(scaleIndex += 1)}` : question.name;

      return `
        <div class="question ${question.type === "choice" ? "choice-question" : ""}" data-question>
          <fieldset>
            <legend>
              <span>${String(index + 1).padStart(2, "0")}</span>
              ${question.label}
            </legend>
            ${
              question.type === "choice"
                ? `
                  <div class="choice-grid" aria-label="${question.label}">
                    ${question.options
                      .map(
                        (option) => `
                          <label>
                            <input type="radio" name="${question.name}" value="${option}" required />
                            <span>${option}</span>
                          </label>
                        `,
                      )
                      .join("")}
                  </div>
                `
                : `
                  <div class="scale" aria-label="${archetype.title} question ${index + 1}">
                    ${[1, 2, 3, 4, 5]
                      .map(
                        (value) => `
                          <label>
                            <input type="radio" name="${scaleName}" value="${value}" data-score required />
                            <span>${value}</span>
                          </label>
                        `,
                      )
                      .join("")}
                  </div>
                `
            }
          </fieldset>
        </div>
      `;
    })
    .join("");
}

function renderThemes(archetype) {
  assessmentThemes.innerHTML = archetype.themes
    .map((theme) => `<span>${theme}</span>`)
    .join("");
}

function resetResult() {
  if (!resultPanel) return;
  resultPanel.dataset.state = "empty";
  if (resultEmpty) resultEmpty.hidden = false;
  if (resultFilled) resultFilled.hidden = true;
  if (previewSection) previewSection.hidden = true;
}

function selectArchetype(id) {
  selectedArchetype = archetypes.find((archetype) => archetype.id === id);

  document.querySelectorAll(".role-card").forEach((button) => {
    const isSelected = button.dataset.role === id;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  assessmentType.textContent = selectedArchetype.title;
  assessmentName.textContent = selectedArchetype.assessment;
  assessmentFocus.textContent = selectedArchetype.focus;
  assessmentFear.textContent = `"${selectedArchetype.fear}"`;
  renderThemes(selectedArchetype);
  renderQuestions(selectedArchetype);
  form.reset();
  resetResult();
}

function buildObservations({ archetype, exposure, reaction, protect, risk, scaleAverage }) {
  const observations = [];

  // Observation 1 — what the person named as exposed
  if (exposure) {
    observations.push(
      `You identified <strong>${exposure.toLowerCase()}</strong> as the area of your value most affected by AI. That is the lens the Deep Scan would use first.`,
    );
  }

  // Observation 2 — relationship between protect and the scale answers
  if (protect && scaleAverage !== null) {
    const confidence = scaleAverage >= 3.6
      ? "with reasonable confidence"
      : scaleAverage >= 2.4
        ? "with mixed confidence"
        : "with limited confidence in your current position";
    observations.push(
      `You named <strong>${protect.toLowerCase()}</strong> as the value to protect, while answering the role questions ${confidence}. The Deep Scan would test whether that gap is one of practice, of language, or of positioning.`,
    );
  }

  // Observation 3 — reaction + risk tension
  if (reaction && risk) {
    observations.push(
      `Your private response to AI is closest to <strong>${reaction.toLowerCase()}</strong>, while the area you most need to manage is <strong>${risk.toLowerCase()}</strong>. The relationship between those two is usually where the first coaching conversation begins.`,
    );
  }

  return observations;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const values = Array.from(form.querySelectorAll("input[data-score]:checked")).map(
    (input) => Number(input.value),
  );
  const total = values.reduce((sum, value) => sum + value, 0);
  const scaleAverage = values.length ? total / values.length : null;
  const profile = profiles
    .slice()
    .reverse()
    .find((item) => total >= item.min);

  const data = new FormData(form);
  const exposure = data.get("exposure");
  const reaction = data.get("reaction");
  const risk = data.get("risk");
  const protect = data.get("protect");

  // Result panel — named position
  resultTitle.textContent = `${selectedArchetype.title} — ${profile.label}`;
  resultCopy.textContent = profile.copy;

  // Three observations
  const observations = buildObservations({
    archetype: selectedArchetype,
    exposure,
    reaction,
    protect,
    risk,
    scaleAverage,
  });
  resultObservations.innerHTML = observations
    .map((text) => `<li>${text}</li>`)
    .join("");

  // Tension to test
  resultTension.textContent = profile.tension;

  // Recommended route
  resultRoute.textContent = profile.route;

  // Toggle state
  resultPanel.dataset.state = "filled";
  if (resultEmpty) resultEmpty.hidden = true;
  if (resultFilled) resultFilled.hidden = false;

  // Personalised preview
  if (previewSection && selectedArchetype.brief) {
    previewHeadline.textContent = `What the Deep Scan would add for ${selectedArchetype.title}.`;
    previewBriefTitle.textContent = `AI Navigation Brief — ${selectedArchetype.title}`;
    previewExposed.textContent = selectedArchetype.brief.exposed;
    previewDefensible.textContent = selectedArchetype.brief.defensible;
    previewBlindspot.textContent = selectedArchetype.brief.blindspot;
    previewSection.hidden = false;

    // Gentle scroll to the result panel so the visitor sees what changed
    setTimeout(() => {
      resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }
});

form.addEventListener("click", (event) => {
  const option = event.target.closest(".scale label, .choice-grid label");
  if (!option) return;

  const input = option.querySelector("input");
  if (!input) return;

  input.checked = true;
  input.dispatchEvent(new Event("change", { bubbles: true }));
});

renderRoleCards();
selectArchetype(selectedArchetype.id);
