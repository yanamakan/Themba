/* Themba Inclusive Access — dependency-free, isolated feature.
   No authentication, USSD service, messaging provider or money movement occurs.
   Load after inclusive-access.css; exposes window.ThembaInclusiveAccess. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ThembaInclusiveAccess = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const COPY = {
    en: {
      language: 'English', welcome: 'Welcome to Themba', menu: '1 Balance  2 Contributions  3 Next payout  4 Protection reserve  0 Language  9 Help',
      balance: 'Rotation pot', reserve: 'Protection reserve', contribution: 'Your contribution', next: 'Next payout', help: 'Need help? Contact your stokvel committee.', changed: 'Language changed to English.',
      unknown: 'Invalid choice. Choose a menu number.', pending: 'This is a simulation. No money has moved.', voice: 'For balance press 1. For contributions press 2. For your next payout press 3. For the protection reserve press 4. For language press 0.'
    },
    af: {
      language: 'Afrikaans', welcome: 'Welkom by Themba', menu: '1 Saldo  2 Bydraes  3 Volgende uitbetaling  4 Beskermingsreserwe  0 Taal  9 Hulp',
      balance: 'Rotasiepot', reserve: 'Beskermingsreserwe', contribution: 'Jou bydrae', next: 'Volgende uitbetaling', help: 'Hulp nodig? Kontak jou stokvelkomitee.', changed: 'Taal na Afrikaans verander.',
      unknown: 'Ongeldige keuse. Kies ’n nommer.', pending: 'Dit is ’n simulasie. Geen geld is oorgeplaas nie.', voice: 'Vir saldo, druk 1. Vir bydraes, druk 2. Vir die volgende uitbetaling, druk 3. Vir die beskermingsreserwe, druk 4. Vir taal, druk 0.'
    },
    zu: {
      language: 'isiZulu', welcome: 'Siyakwamukela kuThemba', menu: '1 Ibhalansi  2 Iminikelo  3 Inkokhelo elandelayo  4 Isikhwama sokuvikela  0 Ulimi  9 Usizo',
      balance: 'Isikhwama sokujikeleza', reserve: 'Isikhwama sokuvikela', contribution: 'Umnikelo wakho', next: 'Inkokhelo elandelayo', help: 'Udinga usizo? Xhumana nekomiti le-stokvel.', changed: 'Ulimi lushintshelwe esiZulwini.',
      unknown: 'Inketho ayivumelekile. Khetha inombolo.', pending: 'Lokhu kuyisibonelo kuphela. Ayikho imali edlulisiwe.', voice: 'Ukuze uzwe ibhalansi, cindezela u-1. Ngeminikelo, cindezela u-2. Ngenkokhelo elandelayo, cindezela u-3. Ngokulondoloza, cindezela u-4. Ngokukhetha ulimi, cindezela u-0.'
    },
    xh: {
      language: 'isiXhosa', welcome: 'Wamkelekile kuThemba', menu: '1 Ibhalansi  2 Iminikelo  3 Intlawulo elandelayo  4 Ingxowa yokhuseleko  0 Ulwimi  9 Uncedo',
      balance: 'Ingxowa ejikelezayo', reserve: 'Ingxowa yokhuseleko', contribution: 'Umnikelo wakho', next: 'Intlawulo elandelayo', help: 'Ufuna uncedo? Qhagamshelana nekomiti ye-stokvel.', changed: 'Ulwimi lutshintshiwe lwaba sisiXhosa.',
      unknown: 'Ukhetho aluvumelekanga. Khetha inombolo.', pending: 'Lo ngumzekelo kuphela. Akukho mali ithunyelweyo.', voice: 'Ukuphulaphula ibhalansi, cofa u-1. Ngeminikelo, cofa u-2. Ngentlawulo elandelayo, cofa u-3. Ngengxowa yokhuseleko, cofa u-4. Ukutshintsha ulwimi, cofa u-0.'
    },
    nso: {
      language: 'Sepedi', welcome: 'Re go amogela go Themba', menu: '1 Tšhelete  2 Meneelo  3 Tefo ye e latelago  4 Sekhwama sa tšhireletšo  0 Leleme  9 Thušo',
      balance: 'Sekhwama sa go dikološa', reserve: 'Sekhwama sa tšhireletšo', contribution: 'Moneelo wa gago', next: 'Tefo ye e latelago', help: 'O hloka thušo? Ikgokaganye le komiti ya stokvel.', changed: 'Leleme le fetotšwe go Sepedi.', unknown: 'Kgetho ga e a amogelwa.', pending: 'Ke teko feela. Ga go tšhelete ye e rometšwego.', voice: 'Go kwa tšhelete, kgotla 1. Meneelo, kgotla 2. Tefo ye e latelago, kgotla 3. Sekhwama sa tšhireletšo, kgotla 4. Leleme, kgotla 0.'
    },
    st: {
      language: 'Sesotho', welcome: 'Re o amohela ho Themba', menu: '1 Balansa  2 Menehelo  3 Tefo e latelang  4 Letlole la tshireletso  0 Puo  9 Thuso',
      balance: 'Letlole la potoloho', reserve: 'Letlole la tshireletso', contribution: 'Monehelo wa hao', next: 'Tefo e latelang', help: 'O hloka thuso? Ikopanye le komiti ya stokvel.', changed: 'Puo e fetotswe ho Sesotho.', unknown: 'Kgetho ha e sebetse.', pending: 'Ena ke teko feela. Ha ho tjhelete e rometsweng.', voice: 'Ho utlwa balansa, tobetsa 1. Menehelo, tobetsa 2. Tefo e latelang, tobetsa 3. Tshireletso, tobetsa 4. Puo, tobetsa 0.'
    },
    tn: {
      language: 'Setswana', welcome: 'Re go amogela mo Themba', menu: '1 Madi a a leng teng  2 Meneelo  3 Tuelo e e latelang  4 Letlole la tshireletso  0 Puo  9 Thuso',
      balance: 'Letlole la go dikologa', reserve: 'Letlole la tshireletso', contribution: 'Moneelo wa gago', next: 'Tuelo e e latelang', help: 'A o tlhoka thuso? Ikgolaganye le komiti ya stokvel.', changed: 'Puo e fetotswe go Setswana.', unknown: 'Tlhopho ga e a siama.', pending: 'Ke teko fela. Ga go na madi a a rometsweng.', voice: 'Go utlwa madi a a leng teng, tobetsa 1. Meneelo, tobetsa 2. Tuelo e e latelang, tobetsa 3. Tshireletso, tobetsa 4. Puo, tobetsa 0.'
    },
    ss: {
      language: 'siSwati', welcome: 'Wemukelekile kuThemba', menu: '1 Imali lesele  2 Iminikelo  3 Inkokhelo lelandzelako  4 Sikhwama sekuvikela  0 Lulwimi  9 Lusito',
      balance: 'Sikhwama semjikeleto', reserve: 'Sikhwama sekuvikela', contribution: 'Umnikelo wakho', next: 'Inkokhelo lelandzelako', help: 'Udzinga lusito? Tsintsa likomiti le-stokvel.', changed: 'Lulwimi lushintjelwe kusiSwati.', unknown: 'Kukhetsa akukalungi.', pending: 'Lesi sibonelo kuphela. Kute imali ledlulisiwe.', voice: 'Kuva imali, cindzetela 1. Iminikelo, cindzetela 2. Inkokhelo lelandzelako, cindzetela 3. Sikhwama sekuvikela, cindzetela 4. Lulwimi, cindzetela 0.'
    },
    ve: {
      language: 'Tshivenda', welcome: 'Ni tanganedzwa kha Themba', menu: '1 Masheleni  2 Minyikelo  3 Mbadelo i tevhelaho  4 Tshikwama tsha tsireledzo  0 Luambo  9 Thuso',
      balance: 'Tshikwama tsha u mona', reserve: 'Tshikwama tsha tsireledzo', contribution: 'Munyikelo wanu', next: 'Mbadelo i tevhelaho', help: 'Ni toda thuso? Kwamanani na komiti ya stokvel.', changed: 'Luambo lwo shandukiswa lwa vha Tshivenda.', unknown: 'Khetho a yo ngo tea.', pending: 'Holu ndi lusumbedza fhedzi. A hu na masheleni o rumelwaho.', voice: 'U pfa masheleni, pwanye 1. Minyikelo, pwanye 2. Mbadelo i tevhelaho, pwanye 3. Tsireledzo, pwanye 4. Luambo, pwanye 0.'
    },
    ts: {
      language: 'Xitsonga', welcome: 'Mi amukeriwile eka Themba', menu: '1 Mali leyi nga kona  2 Minyikelo  3 Hakelo leyi landzelaka  4 Nkwama wa nsirhelelo  0 Ririmi  9 Mpfuno',
      balance: 'Nkwama wa ku rhendzeleka', reserve: 'Nkwama wa nsirhelelo', contribution: 'Munyikelo wa wena', next: 'Hakelo leyi landzelaka', help: 'U lava mpfuno? Vulavula na komiti ya stokvel.', changed: 'Ririmi ri cinciwile ri va Xitsonga.', unknown: 'Nhlawulo a wu tirhi.', pending: 'Leyi i demo ntsena. A ku na mali leyi rhumeriweke.', voice: 'Ku twa mali, tshikelela 1. Minyikelo, tshikelela 2. Hakelo leyi landzelaka, tshikelela 3. Nsirhelelo, tshikelela 4. Ririmi, tshikelela 0.'
    },
    nr: {
      language: 'isiNdebele', welcome: 'Siyakwamukela kuThemba', menu: '1 Ibhalansi  2 Iminikelo  3 Ukukhokhwa okulandelako  4 Isikhwama sokuvikela  0 Ilimi  9 Isizo',
      balance: 'Isikhwama sokuzungeza', reserve: 'Isikhwama sokuvikela', contribution: 'Umnikelo wakho', next: 'Ukukhokhwa okulandelako', help: 'Ufuna isizo? Thintana nekomidi ye-stokvel.', changed: 'Ilimi litjhugululelwe esiNdebeleni.', unknown: 'Ikhetho alikavumeleki.', pending: 'Lokhu kusibonelo kwaphela. Ayikho imali ethunyelweko.', voice: 'Ukuzwa ibhalansi, gandelela 1. Iminikelo, gandelela 2. Ukukhokhwa okulandelako, gandelela 3. Isikhwama sokuvikela, gandelela 4. Ilimi, gandelela 0.'
    },
    sasl: {
      language: 'South African Sign Language (SASL)', welcome: 'THEMBA — SASL ACCESS MODE', menu: '1 Balance  2 Contributions  3 Next payout  4 Protection reserve  0 Language  9 Help',
      balance: 'Rotation pot', reserve: 'Protection reserve', contribution: 'Your contribution', next: 'Next payout', help: 'SASL signed-video assistance is not yet available. This prototype offers plain written captions and visual navigation.', changed: 'SASL accessibility mode selected (written fallback).', unknown: 'Invalid choice. Choose a number.', pending: 'Demo only. No funds moved. SASL interpreted video is not yet available.', voice: 'SASL is a signed visual language. Use the on-screen captions. No signed video is included in this demonstration.'
    }
  };
  const LANGS = Object.keys(COPY);
  const voiceTags = { en: 'en-ZA', af: 'af-ZA', zu: 'zu-ZA', xh: 'xh-ZA', nso: 'nso-ZA', st: 'st-ZA', tn: 'tn-ZA', ss: 'ss-ZA', ve: 've-ZA', ts: 'ts-ZA', nr: 'nr-ZA' };
  const safe = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (value, currency) => typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: currency || 'ZAR' }).format(value)
    : 'Not connected';
  const clean = (s) => String(s ?? '').slice(0, 64).trim();
  const cssKey = (value) => String(value ?? '').replace(/[^a-z0-9_-]/gi, '');
  function renderAnswer(choice, context, lang = 'en') {
    const t = COPY[lang] || COPY.en;
    const label = context.demo ? 'SAMPLE DATA · NOT LIVE' : 'LIVE DATA NOT CONNECTED';
    const foot = '\n' + label + '\nNo money moved.';
    const group = clean(context.groupName || 'Your stokvel');
    switch (String(choice || '').toUpperCase()) {
      case 'MENU': case 'START': case '': return `${t.welcome}\n${group}\n\n${t.menu.replace(/  /g, '\n')}\n\n${label}`;
      case '1': case 'BAL': case 'BALANCE': return `${t.balance}\n${group}\n${money(context.groupBalance, context.currency)}${foot}`;
      case '2': case 'CONTRIB': case 'CONTRIBUTIONS': return `${t.contribution}\n${clean(context.memberName || 'Member')}\n${money(context.contributionTotal, context.currency)}${foot}`;
      case '3': case 'NEXT': return `${t.next}\n${clean(context.nextPayout || 'Not connected')}${foot}`;
      case '4': case 'RESERVE': return `${t.reserve}\n${money(context.reserveBalance, context.currency)}${foot}`;
      case '9': case 'HELP': return `${t.help}\nNo payment or signup through this demo.`;
      case 'LANG': case 'LANGUAGE': return 'Choose a language in the language selector, or press 0 on the feature phone.';
      default: return `${t.unknown}\nPress Back to return to the main menu.`;
    }
  }
  function mount(target, options = {}) {
    if (typeof document === 'undefined') throw new Error('Themba Inclusive Access needs a browser document.');
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) throw new Error('Themba Inclusive Access mount target not found.');
    if (root.__thembaInclusiveAccess) root.__thembaInclusiveAccess.destroy();
    const uid = 'ia' + Math.random().toString(36).slice(2, 9);
    let context = { demo: false, memberName: 'Member', groupName: 'Your stokvel', groupBalance: null, contributionTotal: null, reserveBalance: null, nextPayout: null, currency: 'ZAR', ...options };
    let locale = LANGS.includes(options.language) ? options.language : 'en';
    let theme = options.theme === 'dark' ? 'dark' : 'light', large = false, highContrast = false;
    let ussdMode = 'menu', languagePage = 0, typed = '', activeChannel = 'whatsapp';
    const chats = { whatsapp: [], sms: [] };
    const title = `Inclusive access · Themba`;
    root.className = (root.className ? root.className + ' ' : '') + 'themba-ia';
    root.setAttribute('data-theme', theme);
    root.innerHTML = `<div class="ia-wrap">
      <header class="ia-top"><div class="ia-brand"><span class="ia-logo" aria-hidden="true">T</span><span>THEMBA<br><span style="font-weight:500;letter-spacing:.06em">Community finance</span></span></div><span class="ia-tag">Inclusive access · Demo</span></header>
      <section class="ia-hero" aria-label="Inclusive access overview"><div><div class="ia-kicker">Everyone deserves access</div><h1>Bank together.<br>On any phone.</h1><p>A simpler way to check stokvel information through a feature phone, SMS, a chat-style experience or voice. Explore the simulated channels below.</p></div><span class="ia-hero-art" aria-hidden="true">◉</span></section>
      <div class="ia-utility"><div class="ia-controls"><label for="${uid}-lang">Language <select id="${uid}-lang" data-ia="language">${LANGS.map(code => `<option value="${safe(code)}" ${locale === code ? 'selected' : ''}>${safe(COPY[code].language)}</option>`).join('')}</select></label></div>
      <div class="ia-controls" aria-label="Accessibility options"><button type="button" class="ia-btn" data-action="text" aria-pressed="false">A+ Larger text</button><button type="button" class="ia-btn" data-action="contrast" aria-pressed="false">◐ High contrast</button><button type="button" class="ia-btn" data-action="theme">☾ Dark mode</button></div></div>
      <div class="ia-note" role="note">Interactive demonstration only. The phone numbers, session, messages, account values and any call prompts here are simulated. No SMS, WhatsApp message, USSD request, real-money transaction or call is sent.</div>
      <div class="ia-grid">
      <section class="ia-card" aria-label="Feature phone USSD simulator"><div class="ia-card-top"><div><span class="ia-section-label"><span class="ia-dot"></span> OFFLINE-FRIENDLY CHANNEL</span><h2>Classic feature phone</h2><p>Press a number, then select OK. Works like a traditional USSD menu.</p></div><span class="ia-tag">USSD</span></div>
        <div class="ia-nokia"><div class="ia-speaker"></div><div class="ia-nokia-logo">THEMBA</div>
          <div class="ia-lcd"><div class="ia-lcd-top"><span>THEMBA · USSD</span><span>▰▰▰</span></div><div class="ia-ussd-text" data-ia="ussd-screen" role="status" aria-live="polite" aria-atomic="true"></div><div class="ia-ussd-entry">Choice: <span data-ia="ussd-entry"></span></div></div>
          <div class="ia-softkeys"><button type="button" data-action="back" aria-label="Back to previous menu">BACK</button><button type="button" data-action="ok" aria-label="Confirm USSD choice">OK ↵</button></div>
          <div class="ia-nokia-keys" data-ia="keys">${[['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']].map(([n, sub]) => `<button type="button" data-digit="${n}" aria-label="Key ${safe(n)}">${safe(n)}<small>${safe(sub) || ' '}</small></button>`).join('')}</div>
        </div><p class="ia-phone-help">Simulated short code: *123# · Press Back to start again.</p>
      </section>
      <section class="ia-card" aria-label="Smartphone messaging simulator"><div class="ia-card-top"><div><span class="ia-section-label"><span class="ia-dot"></span> FAMILIAR MESSAGING</span><h2>Chat on a smartphone</h2><p>Try the SMS or WhatsApp-style bot. These are local demos, not real messages.</p></div><span class="ia-tag">Chat + SMS</span></div>
        <div class="ia-tabs" role="tablist" aria-label="Message channel"><button type="button" role="tab" data-channel="whatsapp" aria-selected="true">WhatsApp-style</button><button type="button" role="tab" data-channel="sms" aria-selected="false">SMS</button></div>
        <div class="ia-modern"><div class="ia-modern-inner"><div class="ia-modern-status"><span>09:41</span><span>▂▃▆ ▰</span></div><div class="ia-modern-head"><span class="ia-avatar">T</span><div><strong data-ia="chat-name">Themba Assistant</strong><span data-ia="chat-type">Offline demo · WhatsApp-style</span></div></div>
        <div class="ia-modern-chat" role="log" aria-live="polite" aria-label="Message history" data-ia="chat-log"></div>
        <form class="ia-composer" data-ia="chat-form"><label for="${uid}-message" class="ia-sr-only">Type message</label><input id="${uid}-message" data-ia="chat-input" maxlength="64" autocomplete="off" placeholder="Try BAL, NEXT, HELP" required><button type="submit" aria-label="Send demo message">➤</button></form>
        </div></div><div class="ia-quick" aria-label="Quick demo commands"><button type="button" data-command="BAL">Balance</button><button type="button" data-command="CONTRIB">Contributions</button><button type="button" data-command="NEXT">Next payout</button><button type="button" data-command="HELP">Help</button></div>
        <p class="ia-live" role="status" data-ia="feedback"></p>
      </section>
      </div>
      <section class="ia-card ia-ivr" aria-label="Voice assisted access"><div class="ia-card-head"><div><span class="ia-section-label"><span class="ia-dot"></span> AUDIO ACCESSIBILITY</span><h2>Voice guidance (IVR-style)</h2><p>Listen to instructions on a supported device. Speech depends on installed browser voices; this is not a real phone call.</p></div><span class="ia-tag">Voice</span></div>
        <div class="ia-ivr-layout"><div><div class="ia-transcript" data-ia="transcript" role="status" aria-live="polite"></div><div class="ia-ivr-controls"><button type="button" class="ia-btn ia-btn-primary" data-action="play">▶ Read aloud</button><button type="button" class="ia-btn" data-action="stop">■ Stop</button><button type="button" class="ia-btn" data-action="voice-next">Hear option 1</button></div><p class="ia-live" data-ia="voice-feedback" role="status"></p></div><div class="ia-call-art" aria-hidden="true">♫</div></div>
      </section>
      <div class="ia-footer"><strong>Integration note:</strong> This module never registers a user, creates a wallet or alters stokvel membership. Connect authenticated member and group data through <code>mount()</code> or <code>updateContext()</code>. See INTEGRATION.md for optional server hooks and production requirements.</div>
    </div>`;
    const q = selector => root.querySelector(selector);
    const qa = selector => [...root.querySelectorAll(selector)];
    const setText = (selector, value) => { const el = q(`[data-ia="${selector}"]`); if (el) el.textContent = String(value ?? ''); };
    function updateUsdd() {
      let output = '';
      if (ussdMode === 'language') {
        const langs = LANGS.slice(languagePage * 9, languagePage * 9 + 9);
        output = 'THEMBA · Languages\n' + langs.map((code, i) => `${i + 1} ${COPY[code].language}`).join('\n') + '\n\n# Next   * Previous\n0 Cancel\nDraft translations.';
      } else if (ussdMode === 'detail') output = renderAnswer(lastChoice, context, locale) + '\n\nBack = main menu';
      else output = renderAnswer('MENU', context, locale);
      setText('ussd-screen', output); setText('ussd-entry', typed || ' _ ');
    }
    let lastChoice = '1';
    function enterChoice(entry) {
      if (ussdMode === 'language') {
        if (entry === '#') { languagePage = Math.min(1, languagePage + 1); typed = ''; updateUsdd(); return; }
        if (entry === '*') { languagePage = Math.max(0, languagePage - 1); typed = ''; updateUsdd(); return; }
        if (entry === '0') { ussdMode = 'menu'; typed = ''; updateUsdd(); return; }
        const index = languagePage * 9 + Number(entry) - 1;
        if (/^\d$/.test(entry) && index >= 0 && index < LANGS.length) { locale = LANGS[index]; q('[data-ia="language"]').value = locale; ussdMode = 'menu'; typed = ''; languagePage = 0; updateUsdd(); updateVoice(); return; }
        typed = ''; updateUsdd(); return;
      }
      if (entry === '0') { ussdMode = 'language'; languagePage = 0; typed = ''; updateUsdd(); return; }
      if (['1', '2', '3', '4', '9'].includes(entry)) { lastChoice = entry; ussdMode = 'detail'; typed = ''; updateUsdd(); return; }
      ussdMode = 'menu'; typed = ''; updateUsdd();
    }
    function addBubble(channel, who, text) {
      chats[channel].push({ who, text: String(text).slice(0, 1500), time: 'Demo' });
      if (chats[channel].length > 40) chats[channel].shift();
    }
    chats.whatsapp.push({ who: 'bot', text: 'Welcome to Themba. Try BAL, CONTRIB, NEXT or HELP. No WhatsApp service is connected.', time: 'Demo' });
    chats.sms.push({ who: 'bot', text: 'Themba SMS demo. Send BAL, CONTRIB, NEXT, HELP or LANG.', time: 'Demo' });
    function updateChat() {
      qa('[data-channel]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.channel === activeChannel)));
      setText('chat-type', activeChannel === 'sms' ? 'Offline demo · SMS' : 'Offline demo · WhatsApp-style');
      setText('chat-name', activeChannel === 'sms' ? 'Themba SMS' : 'Themba Assistant');
      const log = q('[data-ia="chat-log"]'); log.replaceChildren();
      for (const item of chats[activeChannel]) {
        const bubble = document.createElement('div'); bubble.className = `ia-bubble ${item.who === 'you' ? 'you' : 'bot'}`;
        bubble.textContent = item.text;
        const time = document.createElement('small'); time.textContent = item.time;
        bubble.appendChild(time); log.appendChild(bubble);
      }
      log.scrollTop = log.scrollHeight;
    }
    async function sendMessage(raw) {
      const input = clean(raw); if (!input) return;
      const channel = activeChannel; addBubble(channel, 'you', input); updateChat();
      let reply = renderAnswer(input, context, locale);
      if (input.toUpperCase() === 'LANG') reply = 'Use the language selector above to change languages. You can also use 0 on the feature phone.';
      if (typeof context.onCommand === 'function') {
        try {
          const response = await context.onCommand({ channel, command: input, language: locale, groupId: context.groupId, memberId: context.memberId });
          if (response != null) reply = String(response);
        } catch (error) { reply = 'This demo could not retrieve the reply. Please try again.'; }
      }
      addBubble(channel, 'bot', reply); if (activeChannel === channel) updateChat();
      setText('feedback', `Local ${channel === 'sms' ? 'SMS' : 'WhatsApp-style'} demonstration · No message sent.`);
    }
    function updateVoice() {
      const t = COPY[locale] || COPY.en;
      setText('transcript', `${t.welcome}. ${t.voice}\n\n${t.pending}`);
    }
    function speak(text) {
      if (locale === 'sasl') { setText('voice-feedback', 'SASL requires signed visual content. This demo provides text captions only.'); return; }
      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) { setText('voice-feedback', 'This browser does not support speech playback. Follow the transcript above.'); return; }
      const voices = window.speechSynthesis.getVoices();
      const tag = voiceTags[locale];
      const chosen = voices.find(v => v.lang.toLowerCase().startsWith(locale.toLowerCase())) || voices.find(v => v.lang.toLowerCase().startsWith(tag?.toLowerCase() || 'not-present'));
      if (locale !== 'en' && !chosen) { setText('voice-feedback', `A matching ${COPY[locale].language} voice is not installed. Use captions instead.`); return; }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 400)); utterance.lang = chosen?.lang || 'en-ZA'; if (chosen) utterance.voice = chosen; utterance.rate = .88;
      utterance.onerror = () => setText('voice-feedback', 'Audio playback was unavailable. Use the transcript.');
      window.speechSynthesis.speak(utterance);
      setText('voice-feedback', 'Voice playback is on this device only; no call placed.');
    }
    const clickHandler = (e) => {
      const digit = e.target.closest('[data-digit]');
      if (digit && root.contains(digit)) {
        const key = digit.dataset.digit;
        if ((key === '*' || key === '#') && ussdMode === 'language') { enterChoice(key); return; }
        if (key === '#') { typed = ''; updateUsdd(); return; }
        if (key === '*') { typed = typed.slice(0, -1); updateUsdd(); return; }
        typed = key; updateUsdd(); return;
      }
      const channel = e.target.closest('[data-channel]');
      if (channel && root.contains(channel)) { activeChannel = channel.dataset.channel; updateChat(); return; }
      const quick = e.target.closest('[data-command]');
      if (quick && root.contains(quick)) { void sendMessage(quick.dataset.command); return; }
      const button = e.target.closest('[data-action]'); if (!button || !root.contains(button)) return;
      switch (button.dataset.action) {
        case 'back': typed = ''; ussdMode = 'menu'; updateUsdd(); break;
        case 'ok': enterChoice(typed || 'MENU'); break;
        case 'text': large = !large; root.classList.toggle('ia-large', large); button.setAttribute('aria-pressed', String(large)); break;
        case 'contrast': highContrast = !highContrast; root.classList.toggle('ia-high-contrast', highContrast); button.setAttribute('aria-pressed', String(highContrast)); break;
        case 'theme': theme = theme === 'dark' ? 'light' : 'dark'; root.dataset.theme = theme; button.textContent = theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'; break;
        case 'play': speak(q('[data-ia="transcript"]').textContent); break;
        case 'stop': if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setText('voice-feedback', 'Playback stopped.'); break;
        case 'voice-next': speak(renderAnswer('1', context, locale)); break;
      }
    };
    const submitHandler = (e) => { if (e.target.matches('[data-ia="chat-form"]')) { e.preventDefault(); const input = q('[data-ia="chat-input"]'); const raw = input.value; input.value = ''; void sendMessage(raw); } };
    const changeHandler = (e) => { if (e.target.matches('[data-ia="language"]')) { locale = LANGS.includes(e.target.value) ? e.target.value : 'en'; ussdMode = 'menu'; typed = ''; updateUsdd(); updateVoice(); } };
    root.addEventListener('click', clickHandler); root.addEventListener('submit', submitHandler); root.addEventListener('change', changeHandler);
    updateUsdd(); updateChat(); updateVoice();
    const api = {
      updateContext(next) { context = { ...context, ...next }; updateUsdd(); updateVoice(); return api; },
      setLanguage(code) { if (LANGS.includes(code)) { locale = code; q('[data-ia="language"]').value = code; ussdMode = 'menu'; updateUsdd(); updateVoice(); } return api; },
      setTheme(value) {
        if (value === 'dark' || value === 'light') {
          theme = value;
          root.dataset.theme = theme;
          const button = q('[data-action="theme"]');
          if (button) button.textContent = theme === 'dark' ? '☀ Light mode' : '☾ Dark mode';
        }
        return api;
      },
      destroy() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); root.removeEventListener('click', clickHandler); root.removeEventListener('submit', submitHandler); root.removeEventListener('change', changeHandler); root.replaceChildren(); root.classList.remove('themba-ia', 'ia-large', 'ia-high-contrast'); root.removeAttribute('data-theme'); delete root.__thembaInclusiveAccess; }
    };
    root.__thembaInclusiveAccess = api; return api;
  }
  return Object.freeze({ mount, renderAnswer, COPY, LANGS });
});
