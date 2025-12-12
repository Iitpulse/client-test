// Storage keys
export const AUTH_TOKEN = "IITP_TEST_AUTH_TOKEN";
export const TEST_SUBMITTED = "IITP_TEST_SUBMITTED_KEY";

// Time interval for timer updates (ms)
export const TIME_INTERVAL = 100;

// Instructions content
export const GENERAL_INSTRUCTIONS = [
  {
    content: {
      en: "Total duration of the test is 180 minutes.",
      hi: "परीक्षा की कुल अवधि 180 मिनट है।",
    },
  },
  {
    content: {
      en: "The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself.",
      hi: "सर्वर पर घड़ी लगाई गई है तथा आपकी स्क्रीन के दाहिने कोने में शीर्ष पर काउंटडाउन टाइमर में आपके लिए परीक्षा समाप्त करने के लिए शेष समय प्रदर्शित होगा।",
    },
  },
  {
    content: {
      en: 'The Questions Palette displayed on the right side of screen will show the status of each question using colored indicators.',
      hi: "स्क्रीन के दाहिने कोने पर प्रश्न पैलेट, प्रत्येक प्रश्न के लिए रंगीन संकेतकों का उपयोग करके स्थिति दिखाता है।",
    },
  },
];

export const NAVIGATING_INSTRUCTIONS = [
  {
    content: {
      en: "Click on the question number in the Question Palette to go to that question directly.",
      hi: "प्रश्न पैलेट में प्रश्न संख्या पर क्लिक करके सीधे उस प्रश्न पर जाएं।",
    },
  },
  {
    content: {
      en: 'Click on "Save & Next" to save your answer for the current question and move to the next question.',
      hi: '"Save & Next" पर क्लिक करके वर्तमान प्रश्न का उत्तर सुरक्षित करें और अगले प्रश्न पर जाएं।',
    },
  },
  {
    content: {
      en: 'Click on "Mark for Review & Next" to save your answer and mark it for review.',
      hi: '"Mark for Review & Next" पर क्लिक करके उत्तर सुरक्षित करें और पुनर्विचार के लिए चिह्नित करें।',
    },
  },
];

export const ANSWERING_INSTRUCTIONS = [
  {
    content: {
      en: "To select your answer, click on the button of one of the options.",
      hi: "अपना उत्तर चुनने के लिए, विकल्प के बटन पर क्लिक करें।",
    },
  },
  {
    content: {
      en: 'To deselect your chosen answer, click on the "Clear Response" button.',
      hi: 'चयनित उत्तर को हटाने के लिए "Clear Response" बटन पर क्लिक करें।',
    },
  },
  {
    content: {
      en: "To change your answer, click on another option.",
      hi: "उत्तर बदलने के लिए, दूसरे विकल्प पर क्लिक करें।",
    },
  },
  {
    content: {
      en: 'You MUST click on "Save & Next" to save your answer.',
      hi: 'उत्तर सुरक्षित करने के लिए "Save & Next" पर क्लिक करना आवश्यक है।',
    },
  },
];

export const SECTION_INSTRUCTIONS = [
  {
    content: {
      en: "Sections are displayed on the top bar. Click on a section name to view its questions.",
      hi: "अनुभाग शीर्ष बार पर प्रदर्शित हैं। प्रश्न देखने के लिए अनुभाग नाम पर क्लिक करें।",
    },
  },
  {
    content: {
      en: "You can shuffle between sections and questions anytime during the examination.",
      hi: "परीक्षा के दौरान आप किसी भी समय अनुभागों और प्रश्नों के बीच आ-जा सकते हैं।",
    },
  },
];

export const INSTRUCTIONS_WARNING = {
  en: "Please note all questions will appear in your default language. This language can be changed for a particular question later on.",
  hi: "कृपया ध्यान दें कि सभी प्रश्न आपकी चयनित डिफ़ॉल्ट भाषा में दिखाई देंगे।",
};

export const INSTRUCTIONS_CONFIRMATION = {
  en: "I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of any prohibited gadget like mobile phone, bluetooth devices etc.",
  hi: "मैंने उपरोक्त सभी निर्देशों को पढ़ और समझ लिया है। मेरे लिए आवंटित सभी कंप्यूटर हार्डवेयर उचित काम करने की स्थिति में हैं।",
};

// Question status colors
export const STATUS_COLORS = {
  notVisited: "bg-slate-300",
  notAnswered: "bg-red-500",
  answered: "bg-green-500",
  markedForReview: "bg-purple-500",
  answeredAndMarkedForReview: "bg-purple-500 ring-2 ring-green-500",
};

export const STATUS_LABELS = {
  notVisited: { en: "Not Visited", hi: "देखा नहीं गया" },
  notAnswered: { en: "Not Answered", hi: "उत्तर नहीं दिया" },
  answered: { en: "Answered", hi: "उत्तर दिया" },
  markedForReview: { en: "Marked for Review", hi: "पुनर्विचार के लिए चिह्नित" },
  answeredAndMarkedForReview: {
    en: "Answered & Marked for Review",
    hi: "उत्तर दिया और पुनर्विचार के लिए चिह्नित",
  },
};
