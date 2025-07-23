import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { db } from "../firebase/config";
import { onSnapshot, doc, setDoc } from "firebase/firestore";
import { unflattenItems } from "../firebase/utils";
import { ItemsContext } from "./ItemsContext";
import yaml from "js-yaml";

export const ItemsProvider = ({ demo, children }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Use demo data directly from items.yml when demo is true
    if (demo) {
      console.debug("<ItemsProvider /> loading demo data from items.yml");
      fetch(import.meta.env.BASE_URL + "items.yml")
        .then((response) => response.text())
        .then((text) => yaml.load(text))
        .then((demoItems) => {
          // Process demo items to match the format expected by the app
          const processedItems = demoItems.map(item => {
            return {
              ...item,
              id: item.id,
              startingPrice: item.amount,
              endTime: new Date(item.endTime),
              bids: {}
            };
          });
          setItems(processedItems);
        })
        .catch(error => console.error("Error loading demo data:", error));
      return; // Skip Firebase setup when in demo mode
    }

    // Only connect to Firebase when not in demo mode
    const docRef = doc(db, "auction", "items");
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        // Populate items state
        console.debug("<ItemsProvider /> read from auction/items");
        setItems(unflattenItems(doc, demo));
      } else {
        // Create empty doc
        console.debug("<ItemsProvider /> write to auction/items");
        setDoc(docRef, {});
      }
    });

    return () => {
      // Clean up the listener on unmount (only if not in demo mode)
      if (!demo && unsubscribe) {
        unsubscribe();
      }
    };
  }, [demo]);

  return (
    <ItemsContext.Provider value={{ items }}>{children}</ItemsContext.Provider>
  );
};

ItemsProvider.propTypes = {
  demo: PropTypes.bool,
  children: PropTypes.object
}
