import { useState } from "react";
import { Link } from "react-router-dom";
import { t, type Locale } from "../../lib/i18n";
import { getSessionUser } from "../../lib/auth";
import layoutStyles from "../MainLayout.module.css";
import styles from "./SubscriptionsPage.module.css";

type SubscriptionsPageProps = {
  locale: Locale;
};

type BillingCycle = "monthly" | "yearly";

const FREE_KEYS = ["subs_f_free_1", "subs_f_free_2", "subs_f_free_3", "subs_f_free_4"] as const;
const PLUS_KEYS = [
  "subs_f_plus_1",
  "subs_f_plus_2",
  "subs_f_plus_3",
  "subs_f_plus_4",
  "subs_f_plus_5",
] as const;
const PRO_KEYS = [
  "subs_f_pro_1",
  "subs_f_pro_2",
  "subs_f_pro_3",
  "subs_f_pro_4",
  "subs_f_pro_5",
] as const;

export function SubscriptionsPage({ locale }: SubscriptionsPageProps) {
  const [cycle, setCycle] = useState<BillingCycle>("yearly");
  const session = getSessionUser();

  const plusPrice = cycle === "monthly" ? "subs_price_plus_mo" : "subs_price_plus_yr";
  const proPrice = cycle === "monthly" ? "subs_price_pro_mo" : "subs_price_pro_yr";
  const suffixKey = cycle === "monthly" ? "subs_price_suffix_mo" : "subs_price_suffix_yr";

  return (
    <div className={`${styles["subs-page"]} ${styles["subs-page--fit"]}`}>
      <h1
        className={`${layoutStyles["page-title"]} ${layoutStyles["page-title--compact"]} ${styles["subs-page__title"]}`}
      >
        {t(locale, "page_subscriptions_title")}
      </h1>
      <p className={styles["subs-lead"]}>{t(locale, "subs_hero_lead")}</p>

      <div className={styles["subs-toggle-wrap"]}>
        <div
          className={styles["subs-toggle"]}
          role="tablist"
          aria-label={t(locale, "subs_billing_aria")}
        >
          <button
            type="button"
            role="tab"
            id="subs-tab-monthly"
            aria-selected={cycle === "monthly"}
            aria-controls="subs-panels"
            className={styles["subs-toggle__btn"]}
            onClick={() => setCycle("monthly")}
          >
            {t(locale, "subs_tab_monthly")}
          </button>
          <button
            type="button"
            role="tab"
            id="subs-tab-yearly"
            aria-selected={cycle === "yearly"}
            aria-controls="subs-panels"
            className={styles["subs-toggle__btn"]}
            onClick={() => setCycle("yearly")}
          >
            {t(locale, "subs_tab_yearly")}
          </button>
        </div>
        {cycle === "yearly" ? (
          <span className={styles["subs-toggle__save"]}>{t(locale, "subs_tab_save")}</span>
        ) : null}
      </div>

      <div
        id="subs-panels"
        role="tabpanel"
        aria-labelledby={cycle === "monthly" ? "subs-tab-monthly" : "subs-tab-yearly"}
        className={styles["subs-panels"]}
      >
        <div className={styles["subs-grid"]}>
        <article className={styles["subs-card"]}>
          <h2 className={styles["subs-card__name"]}>{t(locale, "subs_plan_free")}</h2>
          <p className={styles["subs-card__desc"]}>{t(locale, "subs_plan_desc_free")}</p>
          <div className={styles["subs-card__price-row"]}>
            <span className={styles["subs-card__price"]}>{t(locale, "subs_price_free")}</span>
            <span className={styles["subs-card__suffix"]}>{t(locale, "subs_price_suffix_mo")}</span>
          </div>
          <ul className={styles["subs-card__list"]}>
            {FREE_KEYS.map((key) => (
              <li key={key}>{t(locale, key)}</li>
            ))}
          </ul>
          <button type="button" className={`${styles["subs-card__cta"]} ${styles["subs-card__cta--ghost"]}`} disabled>
            {t(locale, "subs_cta_free")}
          </button>
        </article>

        <article className={`${styles["subs-card"]} ${styles["subs-card--featured"]}`}>
          <span className={styles["subs-card__badge"]}>{t(locale, "subs_badge_popular")}</span>
          <h2 className={styles["subs-card__name"]}>{t(locale, "subs_plan_plus")}</h2>
          <p className={styles["subs-card__desc"]}>{t(locale, "subs_plan_desc_plus")}</p>
          <div className={styles["subs-card__price-row"]}>
            <span className={styles["subs-card__price"]}>{t(locale, plusPrice)}</span>
            <span className={styles["subs-card__suffix"]}>{t(locale, suffixKey)}</span>
          </div>
          <ul className={styles["subs-card__list"]}>
            {PLUS_KEYS.map((key) => (
              <li key={key}>{t(locale, key)}</li>
            ))}
          </ul>
          {session ? (
            <button type="button" className={`${styles["subs-card__cta"]} ${styles["subs-card__cta--primary"]}`}>
              {t(locale, "subs_cta_plus")}
            </button>
          ) : (
            <Link
              className={`${styles["subs-card__cta"]} ${styles["subs-card__cta--primary"]} ${styles["subs-card__cta-link"]}`}
              to="/auth"
            >
              {t(locale, "subs_cta_sign_in")}
            </Link>
          )}
        </article>

        <article className={styles["subs-card"]}>
          <h2 className={styles["subs-card__name"]}>{t(locale, "subs_plan_pro")}</h2>
          <p className={styles["subs-card__desc"]}>{t(locale, "subs_plan_desc_pro")}</p>
          <div className={styles["subs-card__price-row"]}>
            <span className={styles["subs-card__price"]}>{t(locale, proPrice)}</span>
            <span className={styles["subs-card__suffix"]}>{t(locale, suffixKey)}</span>
          </div>
          <ul className={styles["subs-card__list"]}>
            {PRO_KEYS.map((key) => (
              <li key={key}>{t(locale, key)}</li>
            ))}
          </ul>
          {session ? (
            <button type="button" className={styles["subs-card__cta"]}>{t(locale, "subs_cta_pro")}</button>
          ) : (
            <Link
              className={`${styles["subs-card__cta"]} ${styles["subs-card__cta-link"]}`}
              to="/auth"
            >
              {t(locale, "subs_cta_sign_in")}
            </Link>
          )}
        </article>
        </div>
      </div>
    </div>
  );
}
