export type InfoPage = { title: string; body: string };
export type InfoPages = Record<string, InfoPage>;

/**
 * Slugs the storefront links to. Content is edited in the admin and stored in
 * store_settings under the "pages" key; these are the starting drafts.
 * They are deliberately marked as drafts rather than pretending to be policy.
 */
export const INFO_PAGE_SLUGS = ["terms", "privacy", "returns", "faq"] as const;

export const INFO_PAGE_LABELS: Record<string, string> = {
  terms: "শর্তাবলি",
  privacy: "গোপনীয়তা নীতি",
  returns: "রিটার্ন ও রিফান্ড",
  faq: "প্রশ্নোত্তর",
};

const DRAFT = "⚠️ খসড়া — অ্যাডমিন প্যানেলের “Storefront content” থেকে এই লেখাটি সম্পাদনা করুন।";

export const INFO_PAGE_DEFAULTS: InfoPages = {
  terms: { title: "শর্তাবলি", body: `${DRAFT}\n\nএই ওয়েবসাইট ব্যবহার করে আপনি আমাদের শর্তাবলি মেনে নিচ্ছেন। অর্ডার, মূল্য, ডেলিভারি ও বাতিলকরণ সংক্রান্ত শর্ত এখানে লিখুন।` },
  privacy: { title: "গোপনীয়তা নীতি", body: `${DRAFT}\n\nআমরা কী তথ্য সংগ্রহ করি, কেন করি এবং কীভাবে সুরক্ষিত রাখি—তা এখানে লিখুন।` },
  returns: { title: "রিটার্ন ও রিফান্ড", body: `${DRAFT}\n\nকত দিনের মধ্যে রিটার্ন করা যাবে, কোন পণ্যে প্রযোজ্য নয় এবং রিফান্ড কীভাবে হবে—তা এখানে লিখুন।` },
  faq: { title: "প্রশ্নোত্তর", body: `${DRAFT}\n\nক্রেতাদের সবচেয়ে সাধারণ প্রশ্ন ও উত্তরগুলো এখানে লিখুন।` },
};
