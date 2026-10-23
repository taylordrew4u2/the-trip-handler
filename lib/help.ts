export const HELP_SECTIONS = [
  {
    id: "getting-started", title: "Getting started", intro: "Choose whether you are joining a trip or organizing one.",
    steps: ["Joining: open the organizer’s invite link or enter their join code on Find a trip.", "Complete the guest form and submit it for review.", "Wait for the organizer to approve your application. Approval and payment are separate steps."],
    faqs: [
      { question: "Where do I get a join code?", answer: "Ask the person organizing your trip. Codes and invite links come from the organizer; the app does not assign you to a trip automatically." },
      { question: "What does pending approval mean?", answer: "The organizer has not approved your application yet. If you have not submitted the guest form, complete it first. Submitting the form does not guarantee a spot." },
      { question: "Why are some pages missing?", answer: "Some tools appear after approval. The organizer can also turn off sections that the trip does not need, such as meals or transportation." },
    ],
  },
  {
    id: "guest-form", title: "Guest form and answers", intro: "The guest form tells the organizer what they need to plan your trip.",
    steps: ["Answer each question marked Required. Optional questions can be left blank.", "Use N/A in a text answer if it does not apply. For choices, select the answer that fits.", "Review your answers, then select Submit for review. Answers are saved when you submit."],
    faqs: [
      { question: "Can I save a draft and come back?", answer: "There is no draft save yet. Keep the form open until you submit. Closing or reloading the page can lose answers you have not submitted." },
      { question: "Who can read my answers?", answer: "The trip organizer can review your guest form and preferences. Your guest form answers are not displayed on the group roster. Only share information you are comfortable giving the organizer." },
      { question: "How do I change a submitted answer?", answer: "Open Guest form and select Request changes. The organizer can unlock your form from your application’s answers page. Once it is unlocked, edit your answers and submit again." },
      { question: "Why do the questions look different from before?", answer: "The organizer can edit the form for their trip. Your submitted form keeps a copy of the questions you answered. If your form is unlocked, the current questions apply when you submit again." },
      { question: "What is the difference between Guest form and Preferences?", answer: "The guest form is used to review your application. Preferences are planning details, such as your emergency contact, food needs, and transportation. Preferences become available after approval and can be updated separately." },
    ],
  },
  {
    id: "payments", title: "Costs and payments", intro: "Your trip share and security deposit are shown separately so you can see what you owe.",
    steps: ["Before prices are locked, the displayed trip share is an estimate.", "After the organizer locks prices, open Payment to review your share, deposit, adjustments, and balance.", "Pay by card, or use Venmo or Cash App if the organizer offers them. For a transfer, upload the receipt for the organizer to review."],
    faqs: [
      { question: "How is my share calculated?", answer: "The organizer enters total trip costs and chooses how many ways to split them. For example, $5,600 split seven ways is $800 per person before any bed or personal adjustment. The security deposit is added separately." },
      { question: "Does changing roster spots change the price?", answer: "No. Roster spots and the cost split are separate settings. The organizer chooses both." },
      { question: "What happens to the security deposit?", answer: "The organizer sets the amount and explains the trip’s deposit terms. Read those terms before you agree or pay. Ask the organizer about deposit returns or any charges." },
      { question: "I sent a transfer. Why am I not marked paid?", answer: "Venmo and Cash App receipts need the organizer’s review. A submitted receipt is not a payment confirmation. Check Payment for the review status and contact the organizer if something looks wrong." },
      { question: "Can the organizer change the price after payment?", answer: "The app blocks reopening locked prices once a member has been marked paid. For payment corrections, refunds, or disputes, contact the organizer." },
    ],
  },
  {
    id: "trip-tools", title: "Using the trip tools", intro: "Each section has one job. Start with the tool that matches what you need to do.",
    steps: ["Itinerary shows the plan for each day. Lodging shows where the group is staying.", "Roster shows who is coming. Sleeping is where you choose an available bed.", "Use Meals for food planning, Contributions for things to bring, Expenses for receipts, and Board for group discussion."],
    faqs: [
      { question: "What is the difference between roster spots and beds?", answer: "Roster spots show the planned group size. Beds are the actual sleeping arrangements the organizer adds. A roster spot does not automatically assign you a bed." },
      { question: "How do I choose a bed?", answer: "After approval, open Sleeping and choose an available bed. Shared beds may have space for two people. Some beds have restrictions or a price adjustment; read the details before choosing." },
      { question: "How does meal planning work?", answer: "When the organizer opens meal planning, guests can suggest meals, vote, or sign up to help. The organizer controls the planning phase and final choices. Ask them if suggestions or voting are closed." },
      { question: "What should I put under Contributions?", answer: "Use Contributions to claim something you will bring, such as snacks or shared supplies. This helps the group avoid duplicates. Claiming an item does not record a payment." },
      { question: "What should I put under Expenses?", answer: "Use Expenses to submit a shared trip purchase with its amount and receipt. The organizer reviews expenses. Submitting an expense does not automatically issue a reimbursement." },
      { question: "What is the Board for?", answer: "The Board is a shared discussion space for approved trip members. Use it for group questions and updates. Use your guest form or contact the organizer directly for information you do not want to share with the group." },
    ],
  },
  {
    id: "organizers", title: "Help for organizers", intro: "Open My trips, then Edit details for the trip you want to manage.",
    steps: ["Set the destination, dates, and trip description. Turn off sections you do not need.", "Use Edit intake questions to choose what guests answer. Preview the form, then save your questions.", "Set Roster spots and the cost split separately. Enter total costs, save the split, and lock each cost line when it is final.", "Share the invite link or join code. Review submitted guest forms before approving applicants."],
    faqs: [
      { question: "How do I edit intake questions?", answer: "In the trip’s management page, select Edit intake questions. Open a question to change its wording, help text, heading, choices, or required status. Hide questions you do not need. Name and phone number stay required." },
      { question: "Can I add or remove questions?", answer: "Yes. Add a short answer, long answer, single choice, agreement checkbox, or multiple choice question. New questions can be removed; existing questions can be hidden or restored. Use Move up or Move down to change their order, then Save questions." },
      { question: "Will edits change answers already submitted?", answer: "No. Each new submission saves its question wording and answers together. Changing the form does not rewrite a submitted answer or reopen a locked form. Older forms submitted before the editor was introduced keep their existing answers." },
      { question: "How do I unlock someone’s form?", answer: "Open their application’s answers page and use the unlock button. They can then make changes and resubmit. Editing the questions for your trip does not unlock individual forms." },
      { question: "Does the roster automatically stop approvals when full?", answer: "No. Roster spots control the displayed total and open places. You still choose who to approve. If you reduce the number below the current group size, approved members remain visible." },
      { question: "How do I change the cost split?", answer: "Use Split costs between in Pricing and save it before locking costs. Unlock the trip first if prices are already locked. Changing roster spots does not change the split." },
    ],
  },
  {
    id: "troubleshooting", title: "When something is not working", intro: "Start with the message on the page. It usually tells you what to do next.",
    steps: ["If a form will not submit, check the error message and every Required question.", "If a setting did not change, make sure you selected its Save button and saw a success message.", "Before refreshing an unfinished form, copy any long answers somewhere safe. Unsaved answers may be lost."],
    faqs: [
      { question: "Who should I ask for help?", answer: "Contact the organizer who sent you the invite for questions about approval, trip rules, accessibility, payment, or plans. This help page explains the app; it does not send a message to the organizer." },
      { question: "I cannot find my trip.", answer: "Make sure you signed in with the same email you used to apply. Check the invite link or join code with the organizer. If an application was declined or you left a trip, you may need a different invite or the organizer’s help." },
    ],
  },
] as const;
