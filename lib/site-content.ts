// Real site copy, translated/decoded from WEBSITE_TEXT.rtf (the source file
// was Big5 text that had been double-mangled into mojibake — recovered by
// reversing the encoding, not re-typed by hand). Kept in one file, same
// "single source of truth" convention as lib/stages.ts, so every section
// that needs a piece of this (hero, personal story, philosophy, testimonials)
// pulls from the same place instead of duplicating text inline.

export const FOUNDER = {
  nameEn: "Daniel Andrew Bloom, Ph.D.",
  nameZh: "林安森 博士",
  credentials: "加州大學柏克萊分校博士．加拿大合格 K-12 教師",
  tagline: "與整個家庭一起努力，因為孩子就是未來。",
  photoHero: "/photos/dan1.jpg",
  photoStory: "/photos/dan2.jpg",
} as const;

// Short pull-quote for the hero — an actual sentence from the translated
// Personal Story below, not separately-invented marketing copy.
export const HERO_QUOTE =
  "我想要與每一位學生和家長一起，找出真正適合他們的道路。";

export const PERSONAL_STORY_PARAGRAPHS = [
  "我五歲那年，全家從我出生的布達佩斯移民到我成長的蒙特婁。我們在家說匈牙利語，在學校則每天使用英語與法語。在這樣多語言、多移民背景的環境中成長，讓我很早就明白，學習語言能為孩子帶來多元的機會與視野；我也親眼見證了學習如何幫助孩子建立一致性與穩定感——而這份穩定，往往能讓日後人生中的許多抉擇變得更容易。這樣的成長背景，也讓我後來有機會前往日本擔任英語教師兩年，並學習了一些日語。熟悉日本與亞洲文化之後，我接著在加拿大溫哥華從事教育顧問工作十年，服務許多華語移民家庭，並於 2025 年搬到台北，繼續與日益增加的學生和家庭一起努力。",
  "我很幸運能夠先後在麥基爾大學與加州大學柏克萊分校完成學業。然而，取得博士學位之後，我發現，能夠幫助其他學生與家庭跨越我童年時所跨越過的那些界限，對我來說更有意義。我想要與每一位學生和家長一起，找出真正適合他們的道路。",
  "我在 2019 年創立了 Native English Ltd. 教育顧問公司，因為我發現自己能將對語言與學習的熱愛，與具有意義的跨文化工作結合在一起——也因為我知道，每個家庭都是獨一無二的。憑藉 20 年的教學經驗，我可以告訴你，這份工作最美好的部分，就是與每個家庭建立起的關係，一起讓每個孩子都能發光發熱。2025 年 8 月，我搬到台北，並開始在國立臺灣師範大學與中國文化大學修習中文課程。我很喜歡在台灣生活，也很喜歡與台灣的學生、家長和老師們一起工作。過去一年，我先後在芝麻街教育（台北總部）與內湖的 GEMS Academy 任職。這也是為什麼我在 2026 年夏天創立了 Native English Studio：希望能幫助所有台灣學生、家長與教育工作者，讓台灣學生在申請世界各地大學時，都能發揮出最好的實力。Native English Studio 在這裡，陪你發光，陪你成就最好的自己。",
] as const;

export const PERSONAL_STORY_SIGNOFF = {
  line: "祝福你們學業順利，",
  name: "林安森 博士（加州大學柏克萊分校）",
} as const;

export const PHILOSOPHY_PARAGRAPHS = [
  "良好的教育，始於溫暖、關愛且支持孩子的家庭環境。孩子與青少年既需要探索、提問與玩樂的自由，也需要在思考與行動上建立條理與紀律。有些家長會把孩子的行程排得太滿，這往往在不知不覺中造成焦慮，或是削弱孩子的自信心；也有些家長因為忙於自己的生活，而無法給予孩子足夠的支持。因此，最好的教養方式，往往是在給予孩子穩固的基礎之餘，也保留讓孩子自由探索的溫暖與關愛。家長最擔心的，通常是「孩子將來會不會成功」：能不能考上好大學？能不能找到好工作？能不能接手家業？但家長常常忽略的是，在所有的規劃與要求之外，也該給孩子一份堅實的同理心。事實上，多一點陪伴與真心相處的時光，往往比多上一堂足球課，更能確保孩子未來的成功。",
  "我們的服務，旨在協助家長、孩子、教育機構與學生，一起跨越文化的界線，走向英語世界。我們希望協助整個家庭，不只關注孩子的學業表現，也一起關心孩子的整體活動與社會適應。使用 Native English Studio 之後，學生對於自己在北美及更廣泛的英語世界中生活與學習的能力，會更有信心。他們將擁有同理心、讀書方法與思考能力，不僅能夠進入自己心目中理想的大學，更能在各自的領域中，成為未來的領導者。",
] as const;

export interface Testimonial {
  name: string;
  quote: string;
}

// Verbatim from WEBSITE_TEXT.rtf after decoding, with one word-level fix:
// "我的英文及皺紋得到很大的進步" ("wrinkles") was a decoding artifact, not
// what the student wrote — corrected to "作文" (composition/writing), which
// is what the surrounding sentence about SAT English is clearly describing.
// Flagged to Dan directly; happy to revert if he has the original wording.
export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Ariel Chou",
    quote:
      "我是一個九年級學生的家長，我們接觸 Daniel 的教學並沒有太久，但是我很被他引導教學的方式感動。從第一次見到孩子開始，他很在乎孩子真正喜歡什麼，對什麼事物有熱情，從而以此為基礎，激勵孩子更多學習的動力，而不是一味地追求課業上的數字分數，實在是不可多得的一位好老師，非常感謝您，Daniel!",
  },
  {
    name: "Jack Wu",
    quote:
      "我上了 Daniel 的 SAT 課程進步很多。Daniel 的 SAT 課是正對個人需求。打個比方：如果您的閱讀需要進步的話，Daniel 可以幫助您專門提高閱讀水平。他的教學是靈活的，他可以提供個人化課程。他講解 SAT 的內容讓人非常容易理解。他解釋題目十分清晰。Daniel 的態度非常認真，您可以從他上課時對學生的認真態度看出來。他每一點可以讓學生進步的機會都不會放過。他上課時很有趣，他會用不同的方法解釋和教他的學生。",
  },
  {
    name: "Louisa Wang & Jamin Feng",
    quote:
      "Daniel 是一位非常有經驗的 SAT 老師，他自身畢業於美國名校，有一套非常適合孩子的學習方法和比較新穎的教學模式，他的經驗對準備去美國學習的學生非常有益。他全心投入 SAT 的教學，不但提高孩子的成績，更成為學生的良師益友，使孩子一生受益。",
  },
  {
    name: "Austin Wang",
    quote:
      "自從我跟 Daniel 學習了八個月的 SAT 英文及作文，我的英文及作文得到很大的進步並且學到了很多事情。他每次都會給我很詳細的指導，我有時寫的作文沒有發揮我的水準，他雖然很失望，但還是給我積極正面的鼓勵和詳細的指導。我覺得我從他的教導中學了很多事，是因為他不僅對 SAT 英文以及作文非常專業，而且他對他教的內容有很大的興趣。更重要的是他非常了解像我這樣的青少年的心理以及學習狀態。",
  },
];

// Selected "moments" photos from the provided web1–13.jpg set — candid,
// warm, appropriate for a "happy, welcoming" gallery. Dan should confirm he
// has the rights/consent to publish these publicly before they go live,
// since the people in them are real and identifiable (some appear to be
// minors) — worth a quick check even though these are his own materials.
export const GALLERY_PHOTOS = [
  { src: "/photos/web4.jpg", alt: "Daniel 與學生們的合影" },
  { src: "/photos/web11.jpg", alt: "學生們的開心合照" },
  { src: "/photos/web1.jpg", alt: "活動之夜，學生們的合影" },
  { src: "/photos/web9.jpg", alt: "戶外活動時光" },
  { src: "/photos/web10.jpg", alt: "課堂活動：一起動手做" },
  { src: "/photos/web13.jpg", alt: "小朋友們一起創作" },
  { src: "/photos/web3.jpg", alt: "學生們的合影" },
  { src: "/photos/web7.jpg", alt: "戶外活動：團隊時光" },
] as const;
