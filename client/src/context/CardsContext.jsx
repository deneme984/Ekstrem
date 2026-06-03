// Placeholder - will be implemented by Database Architect Agent
import { createContext, useContext, useState } from 'react';

const CardsContext = createContext(null);

export function CardsProvider({ children }) {
  const [cards, setCards] = useState([]);
  return (
    <CardsContext.Provider value={{ cards, setCards }}>
      {children}
    </CardsContext.Provider>
  );
}

export function useCards() {
  return useContext(CardsContext);
}

export default CardsContext;
