/* ============================================================
   שאלון התאמה - חמש שאלות, ארבעה מסלולי תוצאה.
   הניקוד והנוסחים לקוחים מהשאלון שהכינה בעלת המותג.
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('quiz');
  if (!root) return;

  var MAIL_TO = 'backtosource.mentoring@gmail.com';
  var EN = document.documentElement.lang === 'en';
  var T = EN ? {
    sendResult: 'Email me the result',
    book: 'Book a call',
    noObligation: 'A short intro call, free and without obligation.',
    mailSubject: 'Fit questionnaire - result from the website',
    mailIntro: 'I completed the fit questionnaire on the website. Here is my result:',
    mailTrack: 'Recommended starting point:',
    mailSign: 'Please get back to me to discuss.'
  } : {
    sendResult: 'לשלוח לאסתר את התוצאה',
    book: 'לקביעת שיחה',
    noObligation: 'שיחת היכרות קצרה, ללא עלות וללא התחייבות.',
    mailSubject: 'שאלון התאמה - תוצאה מהאתר',
    mailIntro: 'מילאתי את שאלון ההתאמה באתר. זו התוצאה שקיבלתי:',
    mailTrack: 'נקודת ההתחלה המומלצת:',
    mailSign: 'אשמח שתחזרי אליי לשיחה.'
  };

  var QUESTIONS = EN ? [
    {
      text: 'What best describes where you are right now?',
      options: [
        ['I want to understand what happens when pressure rises, and get first tools to work with', { lecture: 3, workshop: 1 }],
        ['I lead a team and want to turn understanding into tools they will actually use', { workshop: 3, lecture: 1 }],
        ['I hold a key role and need ongoing support with decisions and messaging in real time', { mentoring: 3 }],
        ['I am planning a wider organisational programme - a conference, training days, a boutique event', { boutique: 3 }]
      ]
    },
    {
      text: 'How many people from the organisation need to be part of this?',
      options: [
        ['Just me', { mentoring: 2, lecture: 1 }],
        ['Me and a few key people, up to five', { mentoring: 2, workshop: 1 }],
        ['A whole team, between 5 and 30', { workshop: 2, lecture: 1 }],
        ['A wider organisation or several teams', { boutique: 3, workshop: 1 }]
      ]
    },
    {
      text: 'What mainly gets you stuck under pressure?',
      options: [
        ['Impulsive reactions - pressure turns into anger or freeze', { lecture: 2, workshop: 1 }],
        ['Difficulty turning understanding into action - old patterns return', { workshop: 3 }],
        ['Isolated critical moments that demand immediate clarity', { mentoring: 3 }],
        ['Broad wear that affects several areas of the organisation', { boutique: 2, workshop: 1 }]
      ]
    },
    {
      text: 'Where is the organisation today on resilience and energy management?',
      options: [
        ['At the beginning - we have not done anything on this yet', { lecture: 3 }],
        ['We have had a talk or workshop before and want to go deeper', { workshop: 2, mentoring: 1 }],
        ['No standing framework, but there is an urgent personal need', { mentoring: 3 }],
        ['We want to build an annual or multi-stage process', { boutique: 3, workshop: 1 }]
      ]
    },
    {
      text: 'How much time can you give the process?',
      options: [
        ['A single 60–90 minute session', { lecture: 3 }],
        ['Several sessions, or a workshop spread over time', { workshop: 3 }],
        ['Short regular meetings, 10–20 minutes a week', { mentoring: 3 }],
        ['A full day or several days, flexible on scheduling', { boutique: 3 }]
      ]
    }
  ] : [
    {
      text: 'מה הכי מתאר את המצב שלך כרגע?',
      options: [
        ['אני רוצה להבין מה קורה כשהלחץ עולה, ולקבל כלים ראשונים להתחיל איתם', { lecture: 3, workshop: 1 }],
        ['אני מנהל/ת צוות ורוצה לתרגם הבנה לכלים שהצוות שלי באמת ישתמש בהם', { workshop: 3, lecture: 1 }],
        ['אני בתפקיד מפתח וצריך/ה תמיכה שוטפת בהחלטות ובמסרים בזמן אמת', { mentoring: 3 }],
        ['אני מתכנן/ת מהלך ארגוני רחב - כנס, ימי הדרכה או אירוע בוטיק', { boutique: 3 }]
      ]
    },
    {
      text: 'כמה אנשים מהארגון צריכים להיות חלק מהתהליך?',
      options: [
        ['רק אני', { mentoring: 2, lecture: 1 }],
        ['אני וכמה אנשי מפתח, עד חמישה', { mentoring: 2, workshop: 1 }],
        ['צוות שלם, בין 5 ל־30', { workshop: 2, lecture: 1 }],
        ['ארגון רחב או כמה צוותים', { boutique: 3, workshop: 1 }]
      ]
    },
    {
      text: 'מה בעיקר תוקע אתכם תחת לחץ?',
      options: [
        ['תגובות אימפולסיביות - הלחץ הופך לכעס או לקיפאון', { lecture: 2, workshop: 1 }],
        ['קושי לתרגם הבנה לפעולה - חוזרים לדפוסים הישנים', { workshop: 3 }],
        ['רגעים קריטיים בודדים שדורשים בהירות מיידית', { mentoring: 3 }],
        ['שחיקה רחבה שמשפיעה על כמה תחומים בארגון', { boutique: 2, workshop: 1 }]
      ]
    },
    {
      text: 'באיזה שלב הארגון נמצא היום בנושא חוסן וניהול אנרגיה?',
      options: [
        ['בתחילת הדרך - עדיין לא עשינו כלום בנושא', { lecture: 3 }],
        ['כבר עשינו הרצאה או סדנה בעבר ורוצים להעמיק', { workshop: 2, mentoring: 1 }],
        ['אין מסגרת קבועה אבל יש צורך אישי דחוף', { mentoring: 3 }],
        ['רוצים לבנות תהליך שנתי או רב־שלבי', { boutique: 3, workshop: 1 }]
      ]
    },
    {
      text: 'כמה זמן אפשר להקדיש לתהליך?',
      options: [
        ['מפגש חד־פעמי של 60–90 דקות', { lecture: 3 }],
        ['כמה מפגשים או סדנה שמתפרסת על זמן', { workshop: 3 }],
        ['מפגשים קצרים וקבועים, 10–20 דקות בשבוע', { mentoring: 3 }],
        ['יום שלם או כמה ימים, גמיש מבחינת לוח זמנים', { boutique: 3 }]
      ]
    }
  ];

  var RESULTS = EN ? {
    lecture: {
      tag: 'A',
      title: 'Your starting point: the talk, Aiming for the Peak',
      body: 'Your answers point to awareness and first tools as the main gap - understanding what happens to you and your team under pressure, and getting a starter kit you can use from day one. The talk is built for exactly that: 60–90 minutes moving from automatic reactivity to understanding and control, with the N.T.K method as practice that leaves the room with you.',
      href: 'lecture.html', cta: 'About the talk'
    },
    workshop: {
      tag: 'B',
      title: 'Your starting point: the talk plus the applied workshop',
      body: 'Your answers show the awareness is already there - what is missing is embedding it in the field: practice on real situations from daily work, so the tools do not stay theory. The route: the talk as an opening, followed by an applied workshop where the team practises difficult conversations, tense meetings and decisions under load.',
      href: 'workshop.html', cta: 'About the workshop'
    },
    mentoring: {
      tag: 'C',
      title: 'Your starting point: micro-mentoring',
      body: 'Your answers show you hold a key role with decisions under real time pressure. You are not short of theory - you are short of a second mind that helps sharpen a message, make a call or direct energy right before the moment that matters. Micro-mentoring is built for that: short, frequent sprint sessions that fit your schedule.',
      href: 'contact.html', cta: 'Check the fit'
    },
    boutique: {
      tag: 'D',
      title: 'Your starting point: a tailored organisational production',
      body: 'Your answers point to a wider organisational project - not a single session, but a process combining content, experience and sometimes a boutique setting with location and concept. Every activity is built around your culture, team size and goals.',
      href: 'boutique-experience.html', cta: 'About the boutique day'
    }
  } : {
    lecture: {
      tag: 'א',
      title: 'נקודת ההתחלה שלך: ההרצאה מי על המושכות?',
      body: 'מהתשובות עולה שהאתגר המרכזי הוא ברמת המודעות והכלים הבסיסיים - להבין מה קורה לך ולצוות תחת לחץ, ולקבל ערכה ראשונית שאפשר להתחיל להשתמש בה כבר מהיום הראשון. ההרצאה בנויה בדיוק לנקודה הזו: 60–90 דקות שמעבירות מתגובתיות אוטומטית להבנה ולשליטה, עם שיטת נ.ט.כּ כתרגול שיוצא איתכם מהחדר.',
      href: 'lecture.html', cta: 'לפרטים על ההרצאה'
    },
    workshop: {
      tag: 'ב',
      title: 'נקודת ההתחלה שלך: ההרצאה והסדנה היישומית',
      body: 'מהתשובות עולה שיש כבר מודעות לאתגר - מה שחסר הוא הטמעה בשטח: תרגול על סיטואציות אמיתיות מהעבודה היומיומית, כדי שהכלים לא יישארו תיאוריה. המסלול המתאים: ההרצאה כפתיחה, ואחריה סדנה יישומית שבה הצוות מתרגל שיחות מאתגרות, ישיבות לחוצות וקבלת החלטות תחת עומס.',
      href: 'workshop.html', cta: 'לפרטים על הסדנה'
    },
    mentoring: {
      tag: 'ג',
      title: 'נקודת ההתחלה שלך: מיקרו־מנטורינג',
      body: 'מהתשובות עולה שאת/ה בתפקיד מפתח עם החלטות בלחץ זמן אמיתי. לא חסרה עוד תיאוריה - חסר ראש שני שעוזר לחדד מסר, לקבל החלטה או לכוון אנרגיה בדיוק לפני הרגע הקריטי. מיקרו־מנטורינג בנוי לכך: מפגשי ספרינט קצרים ותכופים, בהתאמה ללוח הזמנים שלך.',
      href: 'contact.html', cta: 'לבדיקת התאמה'
    },
    boutique: {
      tag: 'ד',
      title: 'נקודת ההתחלה שלך: הפקה מותאמת לארגון',
      body: 'מהתשובות עולה שמדובר בפרויקט ארגוני רחב - לא מפגש בודד, אלא תהליך שמשלב תוכן, חוויה ולעיתים גם מסגרת בוטיק עם לוקיישן וקונספט. כל פעילות נבנית לפי תרבות הארגון, גודל הצוות והיעדים שלכם.',
      href: 'boutique-experience.html', cta: 'לפרטים על פעילות בוטיק'
    }
  };

  var step = 0;
  var answers = [];

  var elIntro = root.querySelector('[data-quiz="intro"]');
  var elPlay = root.querySelector('[data-quiz="play"]');
  var elResult = root.querySelector('[data-quiz="result"]');
  var elQ = root.querySelector('[data-quiz="question"]');
  var elOpts = root.querySelector('[data-quiz="options"]');
  var elProg = root.querySelector('[data-quiz="progress"]');
  var elBar = root.querySelector('[data-quiz="bar"]');
  var elBack = root.querySelector('[data-quiz="back"]');
  var elLive = root.querySelector('[data-quiz="live"]');

  function show(which) {
    elIntro.hidden = which !== 'intro';
    elPlay.hidden = which !== 'play';
    elResult.hidden = which !== 'result';
  }

  function render() {
    var q = QUESTIONS[step];
    elQ.textContent = q.text;
    elProg.textContent = 'שאלה ' + (step + 1) + ' מתוך ' + QUESTIONS.length;
    elBar.style.width = ((step) / QUESTIONS.length * 100) + '%';
    elBack.hidden = step === 0;
    elOpts.textContent = '';
    q.options.forEach(function (opt, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz-opt';
      b.textContent = opt[0];
      if (answers[step] === i) b.setAttribute('aria-pressed', 'true');
      b.addEventListener('click', function () { choose(i); });
      elOpts.appendChild(b);
    });
    elLive.textContent = elProg.textContent + '. ' + q.text;
    elQ.focus();
  }

  function choose(i) {
    answers[step] = i;
    if (step < QUESTIONS.length - 1) { step++; render(); }
    else finish();
  }

  function finish() {
    var score = { lecture: 0, workshop: 0, mentoring: 0, boutique: 0 };
    answers.forEach(function (choice, qi) {
      var s = QUESTIONS[qi].options[choice][1];
      for (var k in s) score[k] += s[k];
    });
    var best = 'lecture';
    for (var k in score) if (score[k] > score[best]) best = k;
    var r = RESULTS[best];

    elResult.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'quiz-result';
    wrap.innerHTML =
      '<span class="quiz-tag" aria-hidden="true">' + r.tag + '</span>' +
      '<h3>' + r.title + '</h3>' +
      '<p>' + r.body + '</p>' +
      '<div class="actions">' +
      '<a class="btn btn-primary" href="' + summaryMail(best) + '">' + T.sendResult + '</a>' +
      '<a class="btn btn-ghost" href="' + r.href + '">' + r.cta + '</a>' +
      '<a class="btn btn-ghost" href="contact.html">' + T.book + '</a>' +
      '</div>' +
      '<p class="small muted" style="margin-top:1rem">' + T.noObligation + '</p>';
    elResult.appendChild(wrap);

    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'inst-btn';
    again.style.marginTop = '1.4rem';
    again.style.maxWidth = '18rem';
    again.textContent = EN ? 'Retake the questionnaire' : 'למלא את השאלון מחדש';
    again.addEventListener('click', function () {
      step = 0; answers = []; show('intro');
      root.querySelector('[data-quiz="start"]').focus();
    });
    elResult.appendChild(again);

    elBar.style.width = '100%';
    elLive.textContent = 'התוצאה: ' + r.title;
    show('result');
  }

  /* שליחת התוצאה במייל - כך שהפנייה מגיעה לתיבה עם כל התשובות */
  function summaryMail(track) {
    var lines = [T.mailIntro, ''];
    lines.push(T.mailTrack + ' ' + RESULTS[track].title);
    lines.push('');
    answers.forEach(function (choice, qi) {
      lines.push((qi + 1) + '. ' + QUESTIONS[qi].text);
      lines.push('   ' + QUESTIONS[qi].options[choice][0]);
    });
    lines.push('', T.mailSign);
    return 'mailto:' + MAIL_TO
      + '?subject=' + encodeURIComponent(T.mailSubject)
      + '&body=' + encodeURIComponent(lines.join('\n'));
  }

  root.querySelector('[data-quiz="start"]').addEventListener('click', function () {
    step = 0; answers = []; show('play'); render();
  });
  elBack.addEventListener('click', function () {
    if (step > 0) { step--; render(); }
  });
})();
