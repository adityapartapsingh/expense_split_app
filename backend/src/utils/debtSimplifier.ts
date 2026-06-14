export function simplifyDebts(balances: { user: any; balance: number }[]) {
  const creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b }));
  const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b }));

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance); // Most negative first (largest abs value)

  const debts = [];
  let i = 0; // creditors index
  let j = 0; // debtors index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
    
    if (amount > 0.01) {
      debts.push({
        from: debtor.user,
        to: creditor.user,
        amount: Number(amount.toFixed(2)),
        currency: 'INR'
      });
    }

    creditor.balance -= amount;
    debtor.balance += amount;

    if (Math.abs(creditor.balance) < 0.01) i++;
    if (Math.abs(debtor.balance) < 0.01) j++;
  }

  return debts;
}
