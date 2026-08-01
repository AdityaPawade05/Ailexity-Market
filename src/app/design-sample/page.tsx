"use client";

import { useMemo, useState } from "react";
import styles from "./sample.module.css";

type Product = {
  title: string;
  category: "Design" | "Growth" | "Code";
  price: string;
  author: string;
  art: "violet" | "peach" | "mint";
};

const categories = ["For you", "Design", "Growth", "Code"] as const;
const products: Product[] = [
  { title: "The Interface Atlas", category: "Design", price: "$42", author: "Mira Studio", art: "violet" },
  { title: "Signal & Story", category: "Growth", price: "$28", author: "Evan Cole", art: "peach" },
  { title: "Frontend Field Notes", category: "Code", price: "$36", author: "Northstack", art: "mint" },
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function DesignSamplePage() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("For you");
  const [saved, setSaved] = useState<string[]>([]);
  const visibleProducts = useMemo(
    () => activeCategory === "For you" ? products : products.filter((product) => product.category === activeCategory),
    [activeCategory],
  );

  function toggleSaved(title: string) {
    setSaved((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  }

  return (
    <div className={styles.page}>
      <div className={styles.noise} />
      <div className={`${styles.light} ${styles.lightOne}`} />
      <div className={`${styles.light} ${styles.lightTwo}`} />
      <div className={`${styles.light} ${styles.lightThree}`} />

      <header className={`${styles.nav} ${styles.revealNav}`}>
        <a className={styles.brand} href="#top" aria-label="Ailexity Market sample home"><span>A</span> ailexity</a>
        <nav aria-label="Primary navigation" className={styles.navLinks}>
          <a href="#discover">Discover</a>
          <a href="#collections">Collections</a>
          <a href="#creators">For creators</a>
        </nav>
        <div className={styles.navActions}>
          <button className={styles.searchButton} aria-label="Search">⌕</button>
          <a className={styles.signIn} href="/login">Sign in</a>
          <a className={styles.joinButton} href="/register">Join market <Arrow /></a>
        </div>
      </header>

      <main id="top" className={styles.content}>
        <section className={styles.hero}>
          <div className={`${styles.heroCopy} ${styles.revealHero}`}>
            <p className={styles.kicker}><i /> The independent digital market</p>
            <h1>Ideas with<br /><em>their own gravity.</em></h1>
            <p className={styles.intro}>Ailexity is where thoughtful tools, sharp courses, and ambitious creative work find their people.</p>
            <div className={styles.heroActions}>
              <a href="#discover" className={styles.primaryAction}>Explore the orbit <Arrow /></a>
              <a href="#creators" className={styles.textAction}>Meet the creators <span>↓</span></a>
            </div>
            <div className={styles.memberRow}>
              <div className={styles.faces}><b>AK</b><b>RO</b><b>ML</b><b>+</b></div>
              <p><strong>18,000+</strong> curious minds<br />already in the orbit</p>
            </div>
          </div>

          <div className={styles.scene} aria-label="An abstract spatial preview of Ailexity Market products">
            <div className={styles.sceneGlow} />
            <div className={styles.sceneGrid} />
            <div className={styles.orbit} />
            <div className={styles.planet}><span /><span /></div>
            <div className={`${styles.floatCard} ${styles.cardOne}`}><small>01 — FEATURED</small><b>Shape<br />the familiar.</b><span>Editorial systems</span></div>
            <div className={`${styles.floatCard} ${styles.cardTwo}`}><div className={styles.cardTwoArt}><i /><i /><i /></div><small>NEW RELEASE</small><b>Objects in<br />motion</b></div>
            <div className={`${styles.floatCard} ${styles.cardThree}`}><span className={styles.spark}>✦</span><b>01:48:32</b><small>Masterclass</small></div>
            <div className={styles.sceneLabel}><i /> Live collection <strong>28 new drops</strong></div>
          </div>
        </section>

        <section id="discover" className={styles.discovery}>
          <div className={styles.discoveryTop}>
            <div><p className={styles.kicker}><i /> Chosen for momentum</p><h2>Enter the <em>good</em> stuff.</h2></div>
            <a href="#collections" className={styles.viewAll}>View all drops <Arrow /></a>
          </div>
          <div className={styles.filterBar}>
            <div className={styles.tabs} role="tablist" aria-label="Product categories">
              {categories.map((category) => <button key={category} role="tab" aria-selected={activeCategory === category} onClick={() => setActiveCategory(category)} className={activeCategory === category ? styles.activeTab : ""}>{category}</button>)}
            </div>
            <label className={styles.productSearch}><span>⌕</span><input aria-label="Search the sample catalogue" placeholder="Search the orbit" /></label>
          </div>
          <div className={styles.productGrid}>
            {visibleProducts.map((product, index) => <article className={styles.productCard} style={{ animationDelay: `${index * 95}ms` }} key={product.title}>
              <div className={`${styles.productVisual} ${styles[product.art]}`}>
                <div className={styles.productNumber}>0{index + 1}</div>
                <button onClick={() => toggleSaved(product.title)} aria-pressed={saved.includes(product.title)} aria-label={`Save ${product.title}`} className={saved.includes(product.title) ? styles.savedButton : ""}>♥</button>
                <div className={styles.coverArt}><span /><span /><span /></div>
              </div>
              <div className={styles.productInfo}><div><p>{product.category}</p><h3>{product.title}</h3><span>by {product.author}</span></div><strong>{product.price}</strong></div>
            </article>)}
          </div>
        </section>

        <section id="creators" className={styles.creatorCallout}>
          <div className={styles.creatorSphere}><span>✦</span></div>
          <div><p className={styles.kicker}><i /> Made for independent minds</p><h2>Give your work<br />a world of its own.</h2></div>
          <a href="/register" className={styles.primaryAction}>Start selling <Arrow /></a>
        </section>
      </main>
      <footer className={styles.footer}><span>© 2026 Ailexity Market</span><span>Spatial liquid-glass concept</span><a href="#top">Back to top ↑</a></footer>
    </div>
  );
}
