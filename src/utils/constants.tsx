import { InstructionType } from "./interfaces";
import styles from "../pages/Instructions/Instructions.module.scss";
import arrowDown from "../assets/icons/arrowDown.svg";

export const APIS = {
  USERS_API: process.env.USERS_API || "http://localhost:5000",
  QUESTIONS_API: process.env.QUESTIONS_API || "http://localhost:5001",
  TESTS_API: process.env.TESTS_API || "http://localhost:5002",
};

export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
};

const sections = ["Physics", "Chemistry", "Maths"];

export const SAMPLE_TEST = {
  id: "TT_AB123",
  name: "Sample Test",
  description: "Sample Test Description",
  sections: sections.map((sec, i) => ({
    id: "PT_SE_PHY" + i,
    name: sec,
    exam: "JEE Mains",
    subject: "Physics",
    totalQuestions: 40,
    toBeAttempted: 30,
    subSections: [
      {
        id: "PT_SS_MCQ123",
        name: "MCQ",
        description: "Sample MCQ",
        type: "single",
        totalQuestions: 40,
        toBeAttempted: 30,
        questions: Array(40)
          .fill(null)
          .map((_, idx) => ({
            id: "QT_MCQ" + sec + idx + Date.now(),
            question: "What is the meaning of life? " + idx,
            options: [
              {
                id: "QO_MCQ123_A",
                value: "42",
              },
              {
                id: "QO_MCQ123_B",
                value: "The meaning of life",
              },
              {
                id: "QO_MCQ123_C",
                value: "The meaning of life is 42",
              },
              {
                id: "QO_MCQ123_D",
                value: "The meaning of life is not 42",
              },
            ],
            markingScheme: {
              correct: [4],
              incorrect: -1,
            },
            selectedOptions: [],
            type: "mcq",
          })),
      },
    ],
  })),
  exam: "JEE Mains",
  status: "ongoing",
  validity: {
    from: new Date("2022-01-01").toISOString(),
    to: new Date("2022-12-31").toISOString(),
  },
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
};

export const SAMPLE_TEST_FINAL = {
  id: "TT_AB123",
  name: "Sample Test",
  description: "Sample Test Description",
  sections: sections.map((sec) => ({
    id: "PT_SE_PHY123",
    name: sec,
    exam: "JEE Mains",
    subject: "Physics",
    totalQuestions: 40,
    toBeAttempted: 30,
    subSections: [
      {
        id: "PT_SS_MCQ123",
        name: "MCQ",
        description: "Sample MCQ",
        type: "single",
        totalQuestions: 40,
        toBeAttempted: 30,
        questions: [
          {
            id: "QT_MCQ123",
            question: "What is the meaning of life?",
            options: [
              {
                id: "QO_MCQ123_A",
                value: "42",
              },
              {
                id: "QO_MCQ123_B",
                value: "The meaning of life",
              },
              {
                id: "QO_MCQ123_C",
                value: "The meaning of life is 42",
              },
              {
                id: "QO_MCQ123_D",
                value: "The meaning of life is not 42",
              },
            ],
            correctAnswer: "QO_MCQ123_B",
            marks: 1,
          },
        ],
      },
    ],
  })),
  exam: "JEE Mains",
  status: "ongoing",
  validity: {
    from: new Date("2020-01-01").toISOString(),
    to: new Date("2020-12-31").toISOString(),
  },
  attemptedBy: {
    studentsCount: 10,
    locations: ["Bangalore", "Mumbai"],
  },
  result: {
    maxMarks: 1,
    averageMarks: 0.5,
    averageCompletionTime: 30,
    students: [
      {
        name: "John",
        id: "ST_AB123",
        marks: 1,
      },
      {
        name: "Jane",
        id: "ST_AB124",
        marks: 1,
      },
      {
        name: "Jack",
        id: "ST_AB125",
        marks: 1,
      },
      {
        name: "Jill",
        id: "ST_AB126",
        marks: 1,
      },
    ],
  },
  createdBy: {
    id: "IITP_TR_AB123",
    name: "John",
    userType: ROLES.TEACHER,
  },
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
};

const another = {
  id: "TT_AB123",
  name: "Sample Test",
  description: "Sample Test Description",
  sections: [
    {
      id: "PT_SE_PHY123",
      name: "Physics",
      exam: "JEE Mains",
      subject: "Physics",
      totalQuestions: 40,
      toBeAttempted: 30,
      subSections: [
        {
          id: "PT_SS_MCQ123",
          name: "MCQ",
          description: "Sample MCQ",
          type: "single",
          totalQuestions: 40,
          toBeAttempted: 30,
          questions: [
            {
              id: "QT_MCQ123",
              question: "What is the meaning of life?",
              options: [
                {
                  id: "QO_MCQ123_A",
                  value: "42",
                },
                {
                  id: "QO_MCQ123_B",
                  value: "The meaning of life",
                },
                {
                  id: "QO_MCQ123_C",
                  value: "The meaning of life is 42",
                },
                {
                  id: "QO_MCQ123_D",
                  value: "The meaning of life is not 42",
                },
              ],
              correctAnswer: "QO_MCQ123_B",
              marks: 1,
            },
          ],
        },
      ],
    },
  ],
  exam: "JEE Mains",
  status: "ongoing",
  validity: {
    from: "2020-01-01",
    to: "2020-12-31",
  },
  attemptedBy: {
    studentsCount: 10,
    locations: ["Bangalore", "Mumbai"],
  },
  result: {
    maxMarks: 1,
    averageMarks: 0.5,
    averageCompletionTime: 30,
    students: [
      {
        name: "John",
        id: "ST_AB123",
        marks: 1,
      },
      {
        name: "Jane",
        id: "ST_AB124",
        marks: 1,
      },
      {
        name: "Jack",
        id: "ST_AB125",
        marks: 1,
      },
      {
        name: "Jill",
        id: "ST_AB126",
        marks: 1,
      },
    ],
  },
  createdBy: {
    id: "IITP_TR_AB123",
    name: "John",
    userType: "teacher",
  },
  createdAt: "2020-01-01",
  modifiedAt: "2020-01-01",
};

export const GENERAL_INSTRUCTIONS: Array<InstructionType> = [
  {
    type: "text",
    content: {
      en: "Total duration of JEE-Main - PAPER 1 EHG 10th  April SHIFT 2 is 180 min.",
      hi: "सभी प्रश्नों को हल करने की कुल अवधि JEE-Main - PAPER 1 EHG 10th Jan SHIFT 2 के लिए 180 मिनट है।",
    },
  },
  {
    type: "text",
    content: {
      en: "The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.",
      hi: "सर्वर पर घड़ी लगाई गई है तथा आपकी स्क्रीन के दाहिने कोने में शीर्ष पर काउंटडाउन टाइमर में आपके लिए परीक्षा समाप्त करने के लिए शेष समय प्रदर्शित होगा। परीक्षा समय समाप्त होने पर, आपको अपनी परीक्षा बंद या जमा करने की जरूरत नहीं है । यह स्वतः बंद या जमा हो जाएगी।",
    },
  },
  {
    type: "text",
    content: {
      en: "The Questions Palette displayed on the right side of screen will show the status of each question using one of the following symbols:",
      hi: "स्क्रीन के दाहिने कोने पर प्रश्न पैलेट, प्रत्येक प्रश्न के लिए निम्न में से कोई एक स्थिति प्रकट करता है:",
    },
    children: [
      {
        type: "rich",
        content: {
          en: (
            <span>
              <span className={styles.notVisitedBtn}></span>
              You have not visited the question yet.
            </span>
          ),
          hi: (
            <span>
              <span className={styles.notVisitedBtn}></span>
              आप अभी तक प्रश्न पर नहीं गए हैं।
            </span>
          ),
        },
      },
      {
        type: "rich",
        content: {
          en: (
            <span>
              <span className={styles.notAnswered}></span>
              You have not answered the question.
            </span>
          ),
          hi: (
            <span>
              <span className={styles.notAnswered}></span>
              आपने प्रश्न का उत्तर नहीं दिया है।
            </span>
          ),
        },
      },
      {
        type: "rich",
        content: {
          en: (
            <span>
              <span className={styles.answered}></span>
              You have answered the question.
            </span>
          ),
          hi: (
            <span>
              <span className={styles.answered}></span>
              आप प्रश्न का उत्तर दे चुके हैं।
            </span>
          ),
        },
      },
      {
        type: "rich",
        content: {
          en: (
            <span>
              <span className={styles.markForReview}></span>
              You have NOT answered the question but have marked for review.
            </span>
          ),
          hi: (
            <span>
              <span className={styles.markForReview}></span>
              आपने प्रश्न का उत्तर नहीं दिया है पर प्रश्न को पुनर्विचार के लिए
              चिन्हित किया है।
            </span>
          ),
        },
      },
      {
        type: "rich",
        content: {
          en: (
            <span>
              <span className={styles.answeredAndMarkForReview}></span>
              The question(s) "Answered and Marked for Review" will be
              considered for evalution.
            </span>
          ),
          hi: (
            <span>
              <span className={styles.answeredAndMarkForReview}></span>
              प्रश्न जिसका उत्तर दिया गया है और समीक्षा के लिए भी चिन्हित है ,
              उसका मूल्यांकन किया जायेगा ।
            </span>
          ),
        },
      },
    ],
  },
  {
    type: "text",
    content: {
      en: 'You can click on the ">" arrow which apperes to the left of question palette to collapse the question palette thereby maximizing the question window. To view the question palette again, you can click on "<" which appears on the right side of question window.',
      hi: 'आप प्रश्न पैलेट को छुपाने के लिए ">" चिन्ह पर क्लिक कर सकते है, जो प्रश्न पैलेट के बाईं ओर दिखाई देता है, जिससे प्रश्न विंडो सामने आ जाएगा. प्रश्न पैलेट को फिर से देखने के लिए, "<" चिन्ह पर क्लिक कीजिए जो प्रश्न विंडो के दाईं ओर दिखाई देता है।',
    },
  },
  {
    type: "text",
    content: {
      en: 'You can click on your "Profile" image on top right corner of your screen to change the language during the exam for entire question paper. On clicking of Profile image you will get a drop-down to change the question content to the desired language.',
      hi: "सम्पूर्ण प्रश्नपत्र की भाषा को परिवर्तित करने के लिए आपको अपने स्क्रीन के ऊपरी दाहिने सिरे पर स्थित प्रोफाइल इमेज पर क्लिक करना होगा। प्रोफाइल इमेज को क्लिक करने पर आपको प्रश्न के अंतर्वस्तु को इच्छित भाषा में परिवर्तित करने के लिए ड्राप-डाउन मिलेगा ।",
    },
  },
  {
    type: "rich",
    content: {
      en: (
        <span>
          You can click on{" "}
          <span className={styles.arrowDown}>
            <img src={arrowDown} alt="down-arrow" width={20} />
          </span>
          to navigate to the bottom and{" "}
          <span className={styles.arrowUp}>
            <img src={arrowDown} alt="down-arrow" width={20} />
          </span>
          to navigate to the top of the question without scrolling.
        </span>
      ),
      hi: (
        <span>
          आपको अपने स्क्रीन के निचले हिस्से को स्क्रॉलिंग के बिना नेविगेट करने
          के लिए
          <span className={styles.arrowDown}>
            <img src={arrowDown} alt="down-arrow" width={20} />
          </span>
          और ऊपरी हिस्से को नेविगेट करने के लिए
          <span className={styles.arrowUp}>
            <img src={arrowDown} alt="down-arrow" width={20} />
          </span>
          पर क्लिक करना होगा ।
        </span>
      ),
    },
  },
];

export const NAVGATING_TO_QUESTION_INSTRUCTIONS: Array<InstructionType> = [
  {
    type: "text",
    content: {
      en: "To answer a question, do the following",
      hi: "उत्तर देने हेतु कोई प्रश्न चुनने के लिए, आप निम्न में से कोई एक कार्य कर सकते हैं:",
    },
    children: [
      {
        type: "text",
        content: {
          en: "Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.",
          hi: "स्क्रीन के दाईं ओर प्रश्न पैलेट में प्रश्न पर सीधे जाने के लिए प्रश्न संख्या पर क्लिक करें। ध्यान दें कि इस विकल्प का प्रयोग करने से मौजूदा प्रश्न के लिए आपका उत्तर सुरक्षित नहीं होता है।",
        },
      },
      {
        type: "rich",
        content: {
          en: (
            <span>
              Click on &nbsp;<strong>Save & Next</strong>&nbsp; to save your
              answer for the current question and then go to the next question.
            </span>
          ),
          hi: (
            <span>
              वर्तमान प्रश्न का उत्तर सुरक्षित करने के लिए और क्रम में अगले
              प्रश्न पर जाने के लिए &nbsp;<strong>Save & Next</strong>&nbsp; पर
              क्लिक करें।
            </span>
          ),
        },
      },
      {
        type: "rich",
        content: {
          en: (
            <span>
              Click on &nbsp;<strong>Mark for Review & Next</strong>&nbsp; to
              save your answer for the current question, mark it for review, and
              then go to the next question.
            </span>
          ),
          hi: (
            <span>
              Cवर्तमान प्रश्न का उत्तर सुरक्षित करने के लिए, पुनर्विचार के लिए
              चिह्नित करने और क्रम में अगले प्रश्न पर जाने के लिए &nbsp;
              <strong>Mark for Review & Next</strong>&nbsp; पर क्लिक करें।
            </span>
          ),
        },
      },
    ],
  },
];

export const ANSWERING_A_QUESTION_INSTRUCTIONS: Array<InstructionType> = [
  {
    type: "text",
    content: {
      en: "Procedure for answering a multiple choice type question:",
      hi: "बहुविकल्पीय प्रकार के प्रश्न के लिए",
    },
    children: [
      {
        type: "text",
        content: {
          en: "To select you answer, click on the button of one of the options.",
          hi: "अपना उत्तर चुनने के लिए, विकल्प के बटनों में से किसी एक पर क्लिक करें।",
        },
      },
      {
        type: "rich",
        content: {
          en: (
            <span>
              To deselect your chosen answer, click on the button of the chosen
              option again or click on the &nbsp;<strong>Clear Response</strong>
              &nbsp; button
            </span>
          ),
          hi: (
            <span>
              चयनित उत्तर को अचयनित करने के लिए, चयनित विकल्प पर दुबारा क्लिक
              करें या &nbsp;<strong>Clear Response</strong>
              &nbsp; बटन पर क्लिक करें।
            </span>
          ),
        },
      },
      {
        type: "text",
        content: {
          en: "To change your chosen answer, click on the button of another option",
          hi: "अपना उत्तर बदलने के लिए, अन्य वांछित विकल्प बटन पर क्लिक करें।",
        },
      },
      {
        type: "rich",
        content: {
          en: (
            <span>
              To save your answer, you MUST click on the &nbsp;
              <strong>Save & Next</strong> &nbsp; button.
            </span>
          ),
          hi: (
            <span>
              अपना उत्तर सुरक्षित करने के लिए, आपको करें या &nbsp;
              <strong>Save & Next</strong>
              &nbsp; पर क्लिक करना जरूरी है।
            </span>
          ),
        },
      },
      {
        type: "rich",
        content: {
          en: (
            <span>
              To mark the question for review, click on the &nbsp;
              <strong>Mark for Review & Next</strong> &nbsp; button.
            </span>
          ),
          hi: (
            <span>
              किसी प्रश्न को पुनर्विचार के लिए चिह्नित करने हेतु &nbsp;
              <strong>Mark for Review & Next</strong> &nbsp; बटन पर क्लिक करें।
            </span>
          ),
        },
      },
    ],
  },
  {
    type: "text",
    content: {
      en: "To change your answer to a question that has already been answered, first select that question for answering and then follow the procedure for answering that type of question.",
      hi: "किसी प्रश्न का उत्तर बदलने के लिए, पहले प्रश्न का चयन करें, फिर नए उत्तर के विकल्प पर क्लिक करने के बाद Save & Next बटन पर क्लिक करें।",
    },
  },
];

export const NAVIGATING_THROUGH_SECTIONS_INSTRUCTIONS: Array<InstructionType> =
  [
    {
      type: "text",
      content: {
        en: "Sections in this question paper are displayed on the top bar of the screen. Questions in a section can be viewed by click on the section name. The section you are currently viewing is highlighted.",
        hi: "इस प्रश्नपत्र में स्क्रीन के शीर्ष बार पर अनुभाग (Sections) प्रदर्शित हैं। किसी अनुभाग के प्रश्न, उस अनुभाग के नाम पर क्लिक करके देखे जा सकते हैं। आप वर्तमान में जिस अनुभाग का उत्तर दे रहे हैं, वह अनुभाग हाईलाइट होगा।",
      },
    },
    {
      type: "text",
      content: {
        en: "After click the Save & Next button on the last question for a section, you will automatically be taken to the first question of the next section.",
        hi: "किसी अनुभाग के लिए अंतिम प्रश्न के Save & Next बटन पर क्लिक करने के बाद, आप स्वचालित रूप से अगले अनुभाग के प्रथम प्रश्न पर पहुंच जाएंगे।",
      },
    },
    {
      type: "text",
      content: {
        en: "You can shuffle between sections and questions anything during the examination as per your convenience only during the time stipulated.",
        hi: "आप परीक्षा में निर्धारित समय के दौरान किसी भी समय प्रश्नावलियों और प्रश्नों के बीच अपनी सुविधा के अनुसार आ-जा (शफल कर) सकते हैं।",
      },
    },
    {
      type: "text",
      content: {
        en: "Candidate can view the corresponding section summery as part of the legend that appears in every section above the question palette.",
        hi: "परीक्षार्थी संबंधित सेक्शन की समीक्षा को लीजेन्ड के भाग के रूप में देख सकते हैं ।",
      },
    },
  ];

export const INSTRUCTIONS_WARNING: any = {
  en: "Please note all questions will appear in your default language. This language can be changed for a particular question later on.",
  hi: "कृपया ध्यान दें कि सभी प्रश्न आपकी चयनित डिफ़ॉल्ट भाषा में दिखाई देंगे। इस भाषा को बाद में किसी विशेष प्रश्न के लिए बदला जा सकता है ।",
};

export const INSTRUCTIONS_CONFIRMATION: any = {
  en: "I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall.I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action, which may include ban from future Tests / Examinations",
  hi: " मैंने उपरोक्त सभी निर्देशों को पढ़ और समझ लिया है। मेरे लिए आवंटित सभी कंप्यूटर हार्डवेयर उचित काम करने की स्थिति में हैं। मैं घोषणा करता हूं कि मैं किसी भी प्रकार के निषिद्ध गैजेट जैसे मोबाइल फोन, ब्लूटूथ डिवाइस इत्यादि / परीक्षा हॉल में मेरे साथ किसी भी प्रकार की निषिद्ध सामग्री नहीं हैं । मैं सहमत हूं कि निर्देशों का पालन न करने के मामले में, मैं इस टेस्ट और अनुशासनात्मक कार्रवाई के लिए उत्तरदायी होऊँगा, जिसमें भविष्य मे होने वाले टेस्ट / परीक्षाओं से प्रतिबंध भी शामिल हो सकता है ।",
};
