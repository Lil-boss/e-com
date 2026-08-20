export const statusLabel: Record<string, string> = {
  pending: "নতুন", confirmed: "নিশ্চিত", processing: "প্রসেসিং", packed: "প্যাকড", shipped: "ডেলিভারিতে",
  delivered: "সম্পন্ন", cancelled: "বাতিল", return_requested: "রিটার্ন অনুরোধ", returned: "ফেরত", refunded: "রিফান্ড",
  replaced: "বদল", published: "প্রকাশিত", draft: "ড্রাফট", archived: "আর্কাইভ",
  approved: "অনুমোদিত", rejected: "প্রত্যাখ্যাত", flagged: "চিহ্নিত",
};
export const paymentLabel: Record<string, string> = {
  pending: "বকেয়া", authorized: "অনুমোদিত", paid: "পরিশোধিত", failed: "ব্যর্থ", refunded: "রিফান্ড", partially_refunded: "আংশিক রিফান্ড",
};

/** Admin panel runs in English; the storefront keeps the Bengali maps above. */
export const statusLabelEn: Record<string, string> = {
  pending: "New", confirmed: "Confirmed", processing: "Processing", packed: "Packed", shipped: "Shipped",
  delivered: "Delivered", cancelled: "Cancelled", return_requested: "Return requested", returned: "Returned",
  refunded: "Refunded", replaced: "Replaced", published: "Published", draft: "Draft", archived: "Archived",
  approved: "Approved", rejected: "Rejected", flagged: "Flagged",
};
export const paymentLabelEn: Record<string, string> = {
  pending: "Unpaid", authorized: "Authorized", paid: "Paid", failed: "Failed",
  refunded: "Refunded", partially_refunded: "Partially refunded",
};
