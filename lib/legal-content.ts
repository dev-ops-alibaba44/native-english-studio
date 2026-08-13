// Draft legal content, in Traditional Chinese, per Dan's request. IMPORTANT
// caveat that belongs with this file, not just in chat: none of this has
// been reviewed by a lawyer. It's a reasonable starting draft for Dan to
// have reviewed by BC/Taiwan counsel before it governs a real business
// collecting real minors' educational data across two jurisdictions —
// see the note in the batch's README for the one substantive change made
// from what Dan asked for (FOIPPA → PIPA) and why.

export interface LegalDoc {
  slug: "privacy" | "terms" | "disclaimer";
  title: string;
  shortTitle: string;
  updated: string;
  sections: { heading: string; body: string }[];
}

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "privacy",
    title: "隱私權保護聲明",
    shortTitle: "隱私權保護聲明",
    updated: "2026 年 8 月",
    sections: [
      {
        heading: "適用範圍",
        body: "本聲明說明 Native English Ltd.（於加拿大卑詩省註冊之公司，以下稱「本公司」）如何收集、使用、保存與保護您在使用 Native English Studio 平台（以下稱「本服務」）時所提供的個人資料。使用本服務，即表示您已閱讀並理解本聲明的內容。",
      },
      {
        heading: "我們收集哪些資料",
        body: "為提供本服務，我們會收集：（1）帳號資訊，例如姓名、電子郵件、所屬機構；（2）學生申請相關資料，例如成績、測驗分數、課外活動、申請文書內容與修訂紀錄；（3）使用紀錄，例如登入時間、AI 功能使用次數，用於維護服務品質與合理的使用量控管。",
      },
      {
        heading: "我們如何使用您的資料",
        body: "您的資料僅用於：提供並改善本服務（包含文書協作、AI 輔助回饋與腦力激盪、學習檔案管理）、回覆您的詢問與客服需求、以及維護帳號與系統安全。我們不會將您的個人資料出售給第三方，也不會用於與本服務無關的行銷用途。",
      },
      {
        heading: "未成年學生的資料",
        body: "本服務的許多使用者為未成年學生。若學生透過合作機構使用本服務，該機構應負責於學生使用前，依當地法規取得家長或監護人之必要同意。若學生並非透過機構、而是以個人身分使用本服務，須由家長或監護人協助完成註冊並同意本聲明。",
      },
      {
        heading: "資料保護",
        body: "我們採取合理的技術與管理措施保護您的資料，包含存取權限控管（僅限經授權處理該學生資料之顧問與機構管理者可以檢視）與資料加密儲存。惟需注意，任何透過網路傳輸或電子方式儲存的資料，均無法保證絕對安全。",
      },
      {
        heading: "適用法規",
        body: "本公司在加拿大卑詩省註冊，個人資料之處理原則上依卑詩省《個人資訊保護法》（Personal Information Protection Act, PIPA）及加拿大聯邦《個人資訊保護及電子文件法》（PIPEDA）辦理；就台灣使用者之個人資料，亦同時遵循台灣《個人資料保護法》之相關規定。實際適用之法規，將依資料處理地點與使用者所在地而定。",
      },
      {
        heading: "您的權利",
        body: "您可以要求查詢、更正或刪除我們所持有關於您的個人資料，亦可要求我們說明資料的使用情形。如需行使前述權利，請寄信至 info@nativeenglish.ca，我們將於合理時間內回覆處理。",
      },
      {
        heading: "資料保存期間",
        body: "我們會在您的帳號有效期間內保存您的資料，並於帳號終止後，於合理且符合法規要求的期間內保存或刪除相關資料。",
      },
      {
        heading: "本聲明的修訂",
        body: "我們可能不時修訂本聲明，修訂後將公告於本頁面。如有重大變更，我們會另行以合理方式通知使用者。",
      },
      {
        heading: "聯絡我們",
        body: "如對本聲明有任何問題，歡迎寄信至 info@nativeenglish.ca。",
      },
    ],
  },
  {
    slug: "terms",
    title: "使用授權合約",
    shortTitle: "使用授權合約",
    updated: "2026 年 8 月",
    sections: [
      {
        heading: "合約成立",
        body: "本合約為您（「使用者」）與 Native English Ltd.（於加拿大卑詩省註冊之公司，以下稱「本公司」）之間，就使用 Native English Studio 平台（「本服務」）所訂立之約定。註冊、登入或使用本服務，即表示您已閱讀、理解並同意接受本合約之所有條款。",
      },
      {
        heading: "授權範圍",
        body: "本公司授予您一項個人的、非專屬的、不可轉讓的權利，依本服務所提供之功能與您所屬方案（機構授權或個人帳號）使用本服務，僅限於申請文書協作、AI 輔助功能與學習檔案管理等本服務所提供之目的。",
      },
      {
        heading: "資料使用之同意",
        body: "您同意本公司得依本服務之《隱私權保護聲明》所載方式，收集、儲存、處理並使用您所提供之個人資料與申請相關資料，以提供、維護與改善本服務。",
      },
      {
        heading: "帳號責任",
        body: "您應提供真實、正確之註冊資訊，並妥善保管您的帳號與密碼。您應對於使用您帳號所發生之一切行為負責，如發現帳號遭未經授權使用，應立即通知本公司。",
      },
      {
        heading: "費用與方案",
        body: "本服務之收費方式（包含機構年度授權費用、個人訂閱方案等）另行約定於個別方案說明或訂閱條款中，並可能因方案而異。",
      },
      {
        heading: "智慧財產權",
        body: "學生於本服務中撰寫之申請文書內容，其著作權歸該學生所有。本服務之軟體、介面設計、AI 功能與相關系統，其智慧財產權均歸本公司或其授權人所有，使用者不得複製、修改、散布或用於本服務目的以外之用途。",
      },
      {
        heading: "終止",
        body: "本公司得於使用者違反本合約，或依合理商業判斷認為必要時，暫停或終止其帳號。使用者亦得隨時終止使用本服務。",
      },
      {
        heading: "準據法與管轄",
        body: "本合約之效力、解釋及履行，均以加拿大卑詩省法律為準據法。因本合約所生或與本合約有關之一切爭議，雙方同意以英文，由加拿大卑詩省有管轄權之法院進行專屬管轄審理。",
      },
      {
        heading: "合約之修訂",
        body: "本公司得不時修訂本合約，修訂後將公告於本頁面。若您於修訂後繼續使用本服務，視為您已同意修訂後之條款。",
      },
    ],
  },
  {
    slug: "disclaimer",
    title: "AI 內容免責聲明",
    shortTitle: "AI 內容免責聲明",
    updated: "2026 年 8 月",
    sections: [
      {
        heading: "AI 內容僅供參考",
        body: "本服務所提供之 AI 輔助功能，包含腦力激盪引導、文書回饋建議與學習檔案 AI 綜合評估，其內容均僅供參考與啟發思考之用，不代表任何專業意見、保證或承諾。AI 所產生的建議可能包含不準確、不完整，或與實際情況不符之內容。",
      },
      {
        heading: "服務按現況提供",
        body: "本服務係依「現況」（AS IS）與「現有」（AS AVAILABLE）之基礎提供，本公司不對本服務（包含 AI 功能）之準確性、完整性、可靠性或適用於特定目的，做任何明示或默示之保證。",
      },
      {
        heading: "申請結果不予保證",
        body: "本公司、其顧問與 AI 功能所提供之任何建議、評估或機會等級（如衝刺／目標／保底），均不構成對任何學校錄取結果之保證或承諾。學生實際申請結果，取決於眾多本公司無法掌控之因素，包含但不限於該校之招生政策與當年度申請情況。",
      },
      {
        heading: "責任限制",
        body: "在法律允許之最大範圍內，若因使用本服務（包含依賴 AI 所提供之內容）而導致任何直接、間接、附帶或衍生之損害，包含但不限於未能取得預期之申請結果，本公司不負賠償責任。",
      },
      {
        heading: "建議尋求人為判斷",
        body: "AI 功能旨在輔助，而非取代顧問與家長的專業判斷。我們建議使用者於做出重要決定前，仍應諮詢平台上的顧問或其他適當的專業意見。",
      },
    ],
  },
];

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}
