// PokerTable.js

import React, { useEffect, useState } from 'react';
import './PokerTable.css';

const PokerTable = () => {
  // Initialize state variables
  const [bank, setBank] = useState(500);
  const [bet, setBet] = useState(10);
  const [tableCards, setTableCards] = useState([]);
  const [userCards, setUserCards] = useState([]);
  const [result, setResult] = useState('');
  const [winnings, setWinnings] = useState(0);

  // State variables for Telegram user
  const [telegramUser, setTelegramUser] = useState(null);

  // State variables for deposit and withdrawal
  const [depositAddress, setDepositAddress] = useState('');
  const [depositComment, setDepositComment] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');

  // Initialize Telegram Web App
  useEffect(() => {
    const initTelegram = () => {
      const tg = window.Telegram.WebApp;
      const initData = tg.initData;

      // Verify user with backend
      fetch('/api/verifyUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setTelegramUser(data.user);

            // Fetch user balance
            fetch(`/api/getBalance?userId=${data.user.id}`)
              .then((res) => res.json())
              .then((balanceData) => {
                if (balanceData.success) {
                  setBank(balanceData.balance);
                } else {
                  console.error('Error fetching balance:', balanceData.message);
                }
              })
              .catch((error) => {
                console.error('Error fetching balance:', error);
              });

            // Fetch deposit address and comment
            fetch(`/api/getDepositAddress?userId=${data.user.id}`)
              .then((res) => res.json())
              .then((depositData) => {
                if (depositData.success) {
                  setDepositAddress(depositData.address);
                  setDepositComment(depositData.comment);
                } else {
                  console.error('Error fetching deposit address:', depositData.message);
                }
              })
              .catch((error) => {
                console.error('Error fetching deposit address:', error);
              });
          } else {
            alert('Failed to verify Telegram user.');
          }
        })
        .catch((error) => {
          console.error('Error verifying user:', error);
        });
    };

    if (window.Telegram && window.Telegram.WebApp) {
      initTelegram();
    } else {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.onload = initTelegram;
      document.body.appendChild(script);
    }
  }, []);

  // Define the mapping for face card ranks
  const rankMap = {
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };

  // Generate the deck
  const suits = ['h', 'd', 'c', 's']; // Hearts, Diamonds, Clubs, Spades
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  const allCards = [];

  // Build the allCards array
  suits.forEach((suit) => {
    ranks.forEach((rankStr) => {
      let rank = parseInt(rankStr, 10);
      if (isNaN(rank)) {
        rank = rankMap[rankStr];
      }
      const suitName = {
        h: 'hearts',
        d: 'diamonds',
        c: 'clubs',
        s: 'spades',
      }[suit];

      allCards.push({
        rank,
        suit: suitName,
        image: `/assets/cards/${rankStr}${suit}.png`,
      });
    });
  });

  // Increase the bet
  const increaseBet = () => {
    if (bet < bank) setBet(bet + 10);
  };

  // Decrease the bet
  const decreaseBet = () => {
    if (bet > 10) setBet(bet - 10);
  };

  // Shuffle array of cards
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Function to get all combinations of a certain size
  const getCombinations = (array, size) => {
    const results = [];

    const helper = (start, combo) => {
      if (combo.length === size) {
        results.push(combo);
        return;
      }
      for (let i = start; i < array.length; i++) {
        helper(i + 1, combo.concat(array[i]));
      }
    };

    helper(0, []);
    return results;
  };

  // Evaluate hand function
  const evaluateHand = (cards) => {
    // Sort cards by rank
    const sortedCards = cards.slice().sort((a, b) => a.rank - b.rank);

    // Check for Flush
    const suitsCount = {};
    cards.forEach((card) => {
      suitsCount[card.suit] = (suitsCount[card.suit] || 0) + 1;
    });
    const flushSuit = Object.keys(suitsCount).find((suit) => suitsCount[suit] >= 5);
    const isFlush = flushSuit !== undefined;

    // Check for Straight
    let ranks = [...new Set(sortedCards.map((card) => card.rank))];
    let isStraight = false;

    // Handle low-Ace straight (A-2-3-4-5)
    if (ranks.includes(14)) {
      ranks.push(1);
    }
    ranks.sort((a, b) => a - b);

    for (let i = 0; i <= ranks.length - 5; i++) {
      if (
        ranks[i] + 1 === ranks[i + 1] &&
        ranks[i] + 2 === ranks[i + 2] &&
        ranks[i] + 3 === ranks[i + 3] &&
        ranks[i] + 4 === ranks[i + 4]
      ) {
        isStraight = true;
        break;
      }
    }

    // Check for Straight Flush and Royal Flush
    let isStraightFlush = false;
    let isRoyalFlush = false;
    if (isFlush) {
      const flushCards = cards.filter((card) => card.suit === flushSuit);
      const flushRanks = [...new Set(flushCards.map((card) => card.rank))];
      if (flushRanks.includes(14)) {
        flushRanks.push(1);
      }
      flushRanks.sort((a, b) => a - b);
      for (let i = 0; i <= flushRanks.length - 5; i++) {
        if (
          flushRanks[i] + 1 === flushRanks[i + 1] &&
          flushRanks[i] + 2 === flushRanks[i + 2] &&
          flushRanks[i] + 3 === flushRanks[i + 3] &&
          flushRanks[i] + 4 === flushRanks[i + 4]
        ) {
          isStraightFlush = true;
          if (flushRanks.slice(i, i + 5).includes(14) && flushRanks.slice(i, i + 5).includes(10)) {
            isRoyalFlush = true;
          }
          break;
        }
      }
    }

    // Count card occurrences
    const counts = {};
    cards.forEach((card) => {
      counts[card.rank] = (counts[card.rank] || 0) + 1;
    });
    const countsValues = Object.values(counts);
    const hasFourOfKind = countsValues.includes(4);
    const hasThreeOfKind = countsValues.includes(3);
    const pairs = countsValues.filter((count) => count === 2).length;

    // Determine hand rank and fixed winnings
    if (isRoyalFlush) return { hand: 'Royal Flush', winnings: bet * 100 };
    if (isStraightFlush) return { hand: 'Straight Flush', winnings: bet * 20 };
    if (hasFourOfKind) return { hand: 'Four of a Kind', winnings: bet * 10 };
    if (hasThreeOfKind && pairs >= 1) return { hand: 'Full House', winnings: bet * 7 };
    if (isFlush) return { hand: 'Flush', winnings: bet * 5 };
    if (isStraight) return { hand: 'Straight', winnings: bet * 2 };
    if (hasThreeOfKind) return { hand: 'Three of a Kind', winnings: bet * 1.5 };
    if (pairs >= 2) return { hand: 'Two Pair', winnings: bet * 1 };
    if (pairs === 1) return { hand: 'One Pair', winnings: bet * 0.5 };
    return { hand: 'High Card', winnings: 0 };
  };

  // Deal cards (on button click)
  const dealCards = () => {
    if (bank < bet) {
      setResult('Insufficient balance. Cannot deal.');
      return;
    }

    const shuffledDeck = shuffleArray([...allCards]);

    const newUserCards = shuffledDeck.slice(0, 2);
    const newTableCards = shuffledDeck.slice(2, 7);

    setUserCards(newUserCards);
    setTableCards(newTableCards);

    const allPlayerCards = [...newUserCards, ...newTableCards];

    // Generate all possible 5-card combinations
    const combinations = getCombinations(allPlayerCards, 5);

    // Evaluate each hand to find the best one
    let bestHand = { winnings: 0 };
    combinations.forEach((hand) => {
      const evaluation = evaluateHand(hand);
      if (evaluation.winnings > bestHand.winnings) {
        bestHand = evaluation;
      }
    });

    setResult(bestHand.hand);
    const winAmount = bestHand.winnings;
    setWinnings(winAmount);

    const newBalance = bank - bet + winAmount;
    setBank(newBalance);

    // Update balance on backend
    fetch('/api/updateBalance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: telegramUser.id,
        balance: newBalance,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          console.error('Error updating balance:', data.message);
        }
      })
      .catch((error) => {
        console.error('Error updating balance:', error);
      });
  };

  // Handle withdrawal
  const handleWithdraw = (e) => {
    e.preventDefault();

    fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: telegramUser.id,
        amount: withdrawAmount,
        toAddress: withdrawAddress,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert('Withdrawal processed!');
          // Update balance on frontend
          const newBalance = bank - parseFloat(withdrawAmount);
          setBank(newBalance);
          setWithdrawAmount('');
          setWithdrawAddress('');
        } else {
          alert(`Error: ${data.message}`);
        }
      })
      .catch((error) => {
        console.error('Error processing withdrawal:', error);
      });
  };

  return (
    <div className='poker-table'>
      {/* Display Telegram User Info */}
      {telegramUser && (
        <div className='user-info'>
          <span>
            Welcome, {telegramUser.first_name}
            {telegramUser.username ? ` (@${telegramUser.username})` : ''}!
          </span>
        </div>
      )}

      {/* Header Section */}
      <div className='header'>
        <img src='/assets/cardsgroup.png' alt='Cards' className='cards-header' />
        <div className='crown-section'>
          <img src='/assets/icons8-crown-96 1.png' alt='Crown' className='crown-icon' />
          <span className='chips'>{bank}</span>
        </div>
      </div>

      {/* Game Section */}
      <div className='cards-section'>
        {/* Show table cards */}
        <div className='table-cards'>
          {tableCards.map((card, index) => (
            <img key={index} src={card.image} alt={`Table card ${index}`} className='card' />
          ))}
        </div>

        {/* Show user cards */}
        <div className='user-cards'>
          {userCards.map((card, index) => (
            <img key={index} src={card.image} alt={`User card ${index}`} className='card' />
          ))}
        </div>

        {/* Flash text and win result */}
        <div className='flash-text'>{result}</div>
        <div className='win-text'>WIN {winnings}</div>
      </div>

      {/* Controls Section */}
      <div className='controls'>
        <div className='bank'>
          <div className='bank-icon-container'>
            <img src='/assets/PokerChips1.png' alt='Chips' className='bank-icon' />
            <div className='bank-value'>{bank}</div>
          </div>
          <div className='bank-text'>Банк</div>
        </div>

        <button className='deal-button' onClick={dealCards}>
          Раздать
        </button>

        <div className='bet'>
          <div className='bet-icon-container'>
            <img src='/assets/PokerChip2.png' alt='Bet' className='bet-icon' />
            <div className='bet-value'>{bet}</div>
          </div>
          <div className='bet-text'>Ставка</div>
          <div className='bet-controls'>
            <button className='bet-minus' onClick={decreaseBet}>
              -
            </button>
            <button className='bet-plus' onClick={increaseBet}>
              +
            </button>
          </div>
        </div>
      </div>

      {/* Deposit Section */}
      <div className='deposit-section'>
        <h3>Deposit TON Coins</h3>
        <p>Send TON coins to the following address:</p>
        <code>{depositAddress}</code>
        <p>Include this comment in your transaction:</p>
        <code>{depositComment}</code>
      </div>

      {/* Withdrawal Section */}
      <div className='withdrawal-section'>
        <h3>Withdraw Funds</h3>
        <form onSubmit={handleWithdraw}>
          <input
            type='text'
            placeholder='Your TON Wallet Address'
            value={withdrawAddress}
            onChange={(e) => setWithdrawAddress(e.target.value)}
            required
          />
          <input
            type='number'
            placeholder='Amount to Withdraw'
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            min='0'
            max={bank}
            required
          />
          <button type='submit'>Withdraw</button>
        </form>
      </div>
    </div>
  );
};

export default PokerTable;
