import type { SurveyQuestion } from "@/types/survey";

/**
 * Single source of truth for the v1 survey. SurveyQuestion.tsx renders any
 * question generically based on `type`; SurveyContainer.tsx handles
 * conditional visibility (Q2 depends on Q1) and the "exclusive option"
 * behavior (Q9's "No").
 *
 * Order matters for this research project (current behavior -> reasons ->
 * problems -> ideal store) — do not reorder without checking spec section 33.
 */
export const SURVEY_VERSION = "v1";

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: "q1_purchase_channel",
    title: "Where do you usually buy dry fruits?",
    type: "single",
    required: true,
    section: "core",
    allowOther: true,
    options: [
      { value: "local_shop", label: "Local dry-fruit shop" },
      { value: "supermarket", label: "Supermarket" },
      { value: "online", label: "Online website/app" },
      { value: "whatsapp_instagram", label: "WhatsApp/Instagram seller" },
      { value: "wholesale_market", label: "Wholesale market" },
      { value: "dont_buy", label: "I don't usually buy dry fruits" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "q2_store_name",
    title: "If you buy offline, which shop/store do you usually buy from?",
    type: "text",
    placeholder: "Example: NJ Happie Foods, Avadi",
    maxLength: 300,
    section: "core",
    conditional: {
      questionId: "q1_purchase_channel",
      values: ["local_shop", "supermarket", "wholesale_market", "whatsapp_instagram"],
    },
  },
  {
    id: "q2_store_area",
    title: "Which area is the store located in?",
    type: "text",
    placeholder: "Example: Avadi",
    maxLength: 300,
    section: "core",
    conditional: {
      questionId: "q1_purchase_channel",
      values: ["local_shop", "supermarket", "wholesale_market", "whatsapp_instagram"],
    },
  },
  {
    id: "q2_online_platform",
    title: "Which website/app do you usually buy from?",
    type: "text",
    placeholder: "Example: Amazon, BigBasket, Blinkit, brand website",
    maxLength: 300,
    section: "core",
    conditional: { questionId: "q1_purchase_channel", values: ["online"] },
  },
  {
    id: "q3_purchase_reasons",
    title: "What are the main reasons you choose this shop/website?",
    description: "Choose up to 3.",
    type: "multiple",
    maxSelections: 3,
    section: "core",
    allowOther: true,
    options: [
      { value: "price", label: "Price" },
      { value: "product_quality", label: "Product quality" },
      { value: "freshness", label: "Freshness" },
      { value: "trust", label: "Trust" },
      { value: "location_convenience", label: "Location/convenience" },
      { value: "variety", label: "Variety" },
      { value: "offers_discounts", label: "Offers/discounts" },
      { value: "packaging", label: "Packaging" },
      { value: "easy_online_ordering", label: "Easy online ordering" },
      { value: "fast_delivery", label: "Fast delivery" },
      { value: "customer_service", label: "Customer service" },
      { value: "family_tradition", label: "Family has been buying there for a long time" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "q4_likes_most",
    title: "What do you like MOST about your current place to buy dry fruits?",
    type: "textarea",
    placeholder: "I keep buying from this place because...",
    maxLength: 1000,
    section: "core",
  },
  {
    id: "q5_dislikes",
    title: "What do you NOT like about your current dry-fruit shopping experience?",
    description: "Choose all that apply.",
    type: "multiple",
    section: "core",
    allowOther: true,
    options: [
      { value: "price_high", label: "Price is high" },
      { value: "quality_inconsistent", label: "Quality is not always consistent" },
      { value: "not_fresh", label: "Products are sometimes not fresh" },
      { value: "not_enough_variety", label: "Not enough variety" },
      { value: "hard_to_compare", label: "Difficult to compare products" },
      { value: "packaging_could_be_better", label: "Packaging could be better" },
      { value: "no_small_quantity", label: "No small quantity options" },
      { value: "no_customisation", label: "No customisation" },
      { value: "delivery_slow", label: "Delivery takes too long" },
      { value: "delivery_charges_high", label: "Delivery charges are high" },
      { value: "shop_too_far", label: "Shop is too far" },
      { value: "customer_service_could_be_better", label: "Customer service could be better" },
      { value: "unsure_about_quality", label: "I don't know whether the quality is really good" },
      { value: "nothing_happy", label: "Nothing — I'm happy with my current experience" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "q6_change_one_thing",
    title:
      "If you could change ONE thing about your current dry-fruit shop/website, what would you change?",
    type: "textarea",
    placeholder: "If I could change one thing, I would...",
    maxLength: 1000,
    section: "core",
  },
  {
    id: "q7_ideal_features",
    title: "Imagine you could design your PERFECT dry-fruit store.",
    description:
      "Which features would make you say: \"This is much better than my current shop\"? Choose up to 5.",
    type: "multiple",
    maxSelections: 5,
    section: "core",
    allowOther: true,
    options: [
      { value: "better_prices", label: "Better prices" },
      { value: "freshness_guarantee", label: "Freshness guarantee" },
      { value: "better_quality_products", label: "Better-quality products" },
      { value: "more_varieties", label: "More varieties" },
      { value: "transparent_pricing", label: "Transparent pricing" },
      { value: "see_product_before_buying", label: "See the actual product before buying" },
      { value: "different_quantity_options", label: "Different quantity options" },
      { value: "build_own_box", label: "Build my own dry-fruit box" },
      { value: "customised_gift_boxes", label: "Customised gift boxes" },
      { value: "wedding_return_gifts", label: "Wedding/return gifts" },
      { value: "personalised_messages", label: "Personalised names/messages" },
      { value: "home_delivery", label: "Home delivery" },
      { value: "same_day_delivery", label: "Same-day delivery" },
      { value: "easy_whatsapp_ordering", label: "Easy WhatsApp ordering" },
      { value: "easy_website_ordering", label: "Easy website ordering" },
      { value: "loyalty_rewards", label: "Loyalty/reward points" },
      { value: "monthly_subscription", label: "Monthly subscription" },
      { value: "ready_made_hampers", label: "Ready-made gift hampers" },
      { value: "premium_packaging", label: "Premium packaging" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "q8_interested_services",
    title: "Which of these would you personally be interested in?",
    description: "Choose all that apply.",
    type: "multiple",
    section: "core",
    exclusiveOptionValue: "none",
    options: [
      { value: "regular_shopping", label: "Regular dry-fruit shopping" },
      { value: "ready_made_gift_boxes", label: "Ready-made dry-fruit gift boxes" },
      { value: "wedding_return_gifts", label: "Wedding/engagement return gifts" },
      { value: "seemantham_baby_gifts", label: "Seemantham/baby-function gifts" },
      { value: "eid_ramadan_gifting", label: "Eid/Ramadan gifting" },
      { value: "diwali_pongal_gifting", label: "Diwali/Pongal gifting" },
      { value: "corporate_gifting", label: "Corporate gifting" },
      { value: "healthy_snack_boxes", label: "Healthy snack boxes" },
      { value: "monthly_subscription", label: "Monthly dry-fruit subscription" },
      { value: "premium_luxury_boxes", label: "Premium/luxury gift boxes" },
      { value: "none", label: "None" },
    ],
  },
  {
    id: "q9_gift_purchase_history",
    title: "Have you ever purchased dry fruits as a gift?",
    type: "multiple",
    section: "core",
    exclusiveOptionValue: "no",
    allowOther: true,
    options: [
      { value: "wedding_engagement", label: "Wedding/engagement" },
      { value: "eid_ramadan", label: "Eid/Ramadan" },
      { value: "diwali_pongal", label: "Diwali/Pongal" },
      { value: "birthday_anniversary", label: "Birthday/anniversary" },
      { value: "corporate_business", label: "Corporate/business" },
      { value: "other", label: "Other" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "q10_customisation_preferences",
    title: "If creating a customised dry-fruit gift, what would you want to customise?",
    description: "Choose all that apply.",
    type: "multiple",
    section: "core",
    allowOther: true,
    options: [
      { value: "dry_fruit_combination", label: "Dry-fruit combination" },
      { value: "quantity", label: "Quantity" },
      { value: "box_design", label: "Box design" },
      { value: "box_colour", label: "Box colour" },
      { value: "bride_groom_names", label: "Bride & groom names" },
      { value: "wedding_date", label: "Wedding date" },
      { value: "personal_message", label: "Personal message" },
      { value: "family_name", label: "Family name" },
      { value: "photo", label: "Photo" },
      { value: "ribbon", label: "Ribbon" },
      { value: "occasion_theme", label: "Occasion/theme" },
      { value: "budget", label: "Budget" },
      { value: "nothing_prefer_ready_made", label: "Nothing — I prefer ready-made" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "q11_switch_reasons",
    title: "What would make you try a NEW dry-fruit store instead of your current shop?",
    description: "Choose up to 3.",
    type: "multiple",
    maxSelections: 3,
    section: "core",
    options: [
      { value: "better_price", label: "Better price" },
      { value: "better_quality", label: "Better quality" },
      { value: "fresher_products", label: "Fresher products" },
      { value: "more_variety", label: "More variety" },
      { value: "better_packaging", label: "Better packaging" },
      { value: "customised_gifts", label: "Customised gifts" },
      { value: "better_wedding_return_gifts", label: "Better wedding/return-gift options" },
      { value: "home_function_hall_delivery", label: "Home/function-hall delivery" },
      { value: "easy_whatsapp_ordering", label: "Easy WhatsApp ordering" },
      { value: "easy_website_ordering", label: "Easy website ordering" },
      { value: "better_customer_service", label: "Better customer service" },
      { value: "loyalty_rewards", label: "Loyalty/rewards" },
      { value: "attractive_offers", label: "Attractive offers" },
      { value: "something_different", label: "Something completely different" },
      { value: "would_not_switch", label: "I would not switch" },
    ],
  },
  {
    id: "q12_owner_suggestion",
    title: "One final question — you are the owner now!",
    description:
      "If you owned a dry-fruit store, what is ONE thing you would do differently from the shops/websites you use today?",
    type: "textarea",
    placeholder: "Your idea...",
    maxLength: 1000,
    section: "core",
  },
  // --- Optional demographic / segmentation questions ---
  {
    id: "area",
    title: "Which area are you in?",
    description: "Optional — helps us understand demand by location.",
    type: "single",
    section: "demographic",
    allowOther: true,
    options: [
      { value: "Pattabiram", label: "Pattabiram" },
      { value: "Avadi", label: "Avadi" },
      { value: "Nemilicheri", label: "Nemilicheri" },
      { value: "Veppampattu", label: "Veppampattu" },
      { value: "Thiruninravur", label: "Thiruninravur" },
      { value: "Tiruvallur", label: "Tiruvallur" },
      { value: "Chennai", label: "Chennai" },
      { value: "Other", label: "Other" },
    ],
  },
  {
    id: "age_group",
    title: "Which age group do you belong to?",
    description: "Optional.",
    type: "single",
    section: "demographic",
    options: [
      { value: "under_18", label: "Under 18" },
      { value: "18_24", label: "18–24" },
      { value: "25_34", label: "25–34" },
      { value: "35_44", label: "35–44" },
      { value: "45_54", label: "45–54" },
      { value: "55_plus", label: "55+" },
    ],
  },
  {
    id: "purchase_frequency",
    title: "How often do you buy dry fruits?",
    description: "Optional.",
    type: "single",
    section: "demographic",
    options: [
      { value: "every_week", label: "Every week" },
      { value: "2_3_times_a_month", label: "2–3 times a month" },
      { value: "once_a_month", label: "Once a month" },
      { value: "every_few_months", label: "Every few months" },
      { value: "mainly_festivals_functions", label: "Mainly during festivals/functions" },
      { value: "rarely", label: "Rarely" },
    ],
  },
];

/**
 * Groups of question ids rendered together on one screen. Q2's three
 * conditional fields live in one group so offline users see "store name" +
 * "store area" together (per spec) while online users just see the single
 * platform field; whichever fields are inapplicable for the current Q1
 * answer are filtered out at render time, and the whole group is skipped
 * when nothing applies (e.g. Q1 = "I don't usually buy dry fruits").
 */
export const STEP_GROUPS: string[][] = [
  ["q1_purchase_channel"],
  ["q2_store_name", "q2_store_area", "q2_online_platform"],
  ["q3_purchase_reasons"],
  ["q4_likes_most"],
  ["q5_dislikes"],
  ["q6_change_one_thing"],
  ["q7_ideal_features"],
  ["q8_interested_services"],
  ["q9_gift_purchase_history"],
  ["q10_customisation_preferences"],
  ["q11_switch_reasons"],
  ["q12_owner_suggestion"],
  ["area"],
  ["age_group"],
  ["purchase_frequency"],
];

export function getQuestionById(id: string): SurveyQuestion | undefined {
  return SURVEY_QUESTIONS.find((q) => q.id === id);
}

export const CORE_QUESTIONS = SURVEY_QUESTIONS.filter((q) => q.section === "core");
export const DEMOGRAPHIC_QUESTIONS = SURVEY_QUESTIONS.filter((q) => q.section === "demographic");

export const AREA_OPTIONS = [
  "All Areas",
  "Pattabiram",
  "Avadi",
  "Nemilicheri",
  "Veppampattu",
  "Thiruninravur",
  "Tiruvallur",
  "Chennai",
  "Other",
];
