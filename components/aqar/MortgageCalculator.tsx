'use client';
"use client";

import { useState } from "react";
import {
  Calculator,
  DollarSign,
  Calendar,
  TrendingUp,
  FileText,
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

export interface MortgageCalculatorProps {
  propertyPrice?: number;
  currency?: string;
}

export default function MortgageCalculator({
  propertyPrice = 0,
  currency = "SAR",
}: MortgageCalculatorProps) {
  const { t } = useTranslation();
  const [price, setPrice] = useState(propertyPrice || 1000000);
  const [downPayment, setDownPayment] = useState(15); // percentage
  const [interestRate, setInterestRate] = useState(4.5); // annual percentage
  const [loanTerm, setLoanTerm] = useState(25); // years
  const [showAmortization, setShowAmortization] = useState(false);

  // Saudi-specific constraints
  const MIN_DOWN_PAYMENT = 15; // 15% minimum for residents
  // const MAX_LTV = 0.85; // Max 85% loan-to-value (reserved for future validation)
  const MAX_LOAN_TERM = 25; // 25 years max

  // Calculations
  const downPaymentAmount = (price * downPayment) / 100;
  const loanAmount = price - downPaymentAmount;
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;

  // Monthly payment formula: P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyPayment =
    (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  const totalPayment = monthlyPayment * numberOfPayments;
  const totalInterest = totalPayment - loanAmount;
  const totalCost = price + totalInterest;

  // Debt-to-Income ratio (assuming 33% max)
  const requiredMonthlyIncome = monthlyPayment / 0.33;

  // Generate amortization schedule (first 12 months)
  const generateAmortizationSchedule = (months = 12) => {
    const schedule = [];
    let remainingBalance = loanAmount;

    for (let i = 1; i <= months && i <= numberOfPayments; i++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;

      schedule.push({
        month: i,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, remainingBalance),
      });
    }

    return schedule;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-SA").format(Math.round(num));
  };

  return (
    <div className="bg-card rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-warning to-warning-dark rounded-2xl">
          <Calculator className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("aqar.mortgage.title", "Mortgage Calculator")}
          </h2>
          <p className="text-sm text-muted-foreground">
            Calculate your monthly payments
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-6 mb-6">
        {/* Property Price */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="priceSlider"
              className="text-sm font-medium text-foreground"
            >
              {t("aqar.mortgage.propertyPrice", "Property Price")}
            </label>
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(price)}
            </span>
          </div>
          <input
            id="priceSlider"
            type="range"
            min="100000"
            max="10000000"
            step="50000"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-2xl appearance-none cursor-pointer accent-warning focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>100K</span>
            <span>10M</span>
          </div>
        </div>

        {/* Down Payment */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="downPaymentSlider"
              className="text-sm font-medium text-foreground"
            >
              {t("aqar.mortgage.downPayment", "Down Payment")} ({downPayment}%)
            </label>
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(downPaymentAmount)}
            </span>
          </div>
          <input
            id="downPaymentSlider"
            type="range"
            min={MIN_DOWN_PAYMENT}
            max="50"
            step="5"
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-2xl appearance-none cursor-pointer accent-warning focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{MIN_DOWN_PAYMENT}% (Min)</span>
            <span>50%</span>
          </div>
        </div>

        {/* Interest Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="interestRateSlider"
              className="text-sm font-medium text-foreground"
            >
              {t("aqar.mortgage.interestRate", "Interest Rate")}
            </label>
            <span className="text-lg font-bold text-foreground">
              {interestRate.toFixed(2)}%
            </span>
          </div>
          <input
            id="interestRateSlider"
            type="range"
            min="1"
            max="10"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-2xl appearance-none cursor-pointer accent-warning focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1.0%</span>
            <span>10.0%</span>
          </div>
        </div>

        {/* Loan Term */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="loanTermSlider"
              className="text-sm font-medium text-foreground"
            >
              {t("aqar.mortgage.loanTerm", "Loan Term")}
            </label>
            <span className="text-lg font-bold text-foreground">
              {loanTerm} {t("aqar.mortgage.years", "years")}
            </span>
          </div>
          <input
            id="loanTermSlider"
            type="range"
            min="5"
            max={MAX_LOAN_TERM}
            step="5"
            value={loanTerm}
            onChange={(e) => setLoanTerm(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-2xl appearance-none cursor-pointer accent-warning focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>5 {t("aqar.mortgage.years", "years")}</span>
            <span>
              {MAX_LOAN_TERM} {t("aqar.mortgage.years", "years")} (Max)
            </span>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div
        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-6"
        role="region"
        aria-label="Mortgage calculation results"
      >
        <h3 className="text-lg font-bold text-foreground mb-4">
          {t("aqar.mortgage.monthlyPayment", "Monthly Payment")}
        </h3>
        <div
          className="text-4xl font-bold text-warning mb-6"
          aria-live="polite"
          aria-atomic="true"
        >
          {formatCurrency(monthlyPayment)}
          <span className="text-sm font-normal text-muted-foreground">
            /{t("aqar.mortgage.months", "month")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              <span>Loan Amount</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(loanAmount)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Total Interest</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(totalInterest)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calendar className="w-4 h-4" />
              <span>Total Payments</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatNumber(numberOfPayments)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <FileText className="w-4 h-4" />
              <span>Total Cost</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(totalCost)}
            </p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4">
        <h4 className="font-semibold text-primary mb-2">
          Required Monthly Income
        </h4>
        <p className="text-2xl font-bold text-primary">
          {formatCurrency(requiredMonthlyIncome)}
        </p>
        <p className="text-sm text-primary mt-1">
          Based on 33% debt-to-income ratio
        </p>
      </div>

      {/* Amortization Schedule */}
      <div>
        <button
          onClick={() => setShowAmortization(!showAmortization)}
          aria-expanded={showAmortization}
          aria-controls="amortization-schedule"
          aria-label={`${showAmortization ? "Hide" : "View"} amortization schedule`}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2"
        >
          <span className="font-semibold text-foreground">
            View Amortization Schedule
          </span>
          <span className="text-muted-foreground" aria-hidden="true">
            {showAmortization ? "−" : "+"}
          </span>
        </button>

        {showAmortization && (
          <div
            id="amortization-schedule"
            role="region"
            aria-label="Amortization schedule table"
            className="mt-4 overflow-x-auto"
          >
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="bg-muted">
                  <th scope="col" className="px-3 py-2 text-start">
                    Month
                  </th>
                  <th scope="col" className="px-3 py-2 text-end">
                    Payment
                  </th>
                  <th scope="col" className="px-3 py-2 text-end">
                    Principal
                  </th>
                  <th scope="col" className="px-3 py-2 text-end">
                    Interest
                  </th>
                  <th scope="col" className="px-3 py-2 text-end">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {generateAmortizationSchedule(12).map((row) => (
                  <tr key={row.month} className="border-b border-border">
                    <td className="px-3 py-2">{row.month}</td>
                    <td className="px-3 py-2 text-end">
                      {formatCurrency(row.payment)}
                    </td>
                    <td className="px-3 py-2 text-end text-success">
                      {formatCurrency(row.principal)}
                    </td>
                    <td className="px-3 py-2 text-end text-destructive">
                      {formatCurrency(row.interest)}
                    </td>
                    <td className="px-3 py-2 text-end font-semibold">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing first 12 months of {numberOfPayments} total payments
            </p>
          </div>
        )}
      </div>

      {/* Disclaimers */}
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Note:</strong> This calculator provides estimates based on
          Saudi Arabia's mortgage regulations. Minimum down payment is 15% for
          Saudi residents and 30% for non-residents. Maximum loan-to-value (LTV)
          ratio is 85%. Maximum loan term is 25 years. Actual rates and terms
          may vary by lender. Consult with a licensed mortgage advisor for
          accurate information.
        </p>
      </div>
    </div>
  );
}
