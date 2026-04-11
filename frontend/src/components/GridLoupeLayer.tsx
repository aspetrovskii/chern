import styles from "./GridLoupeLayer.module.css";



/**

 * Static grid behind page widgets.

 */

export function GridLoupeLayer() {

  return (

    <div className={styles.root} aria-hidden>

      <div className={styles.base} />

    </div>

  );

}

