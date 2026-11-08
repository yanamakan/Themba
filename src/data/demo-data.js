"use strict";

const treasurerOverview = {
  currency: "ZAR",
  group: {
    id: "khula-savings-circle",
    name: "Khula Savings Circle",
    memberCount: 12
  },
  month: "June 2025",
  contributions: {
    collected: 28500,
    target: 35000,
    outstanding: 6500,
    paidMembers: 9,
    totalMembers: 12
  },
  groupBalance: 248500,
  pendingReceiptCount: 3,
  pendingApprovalCount: 2
};

const contributions = [
  {
    id: "contribution-001",
    member: "Nokuthula Maseko",
    amount: 3500,
    method: "digital",
    status: "confirmed",
    createdAt: "2025-06-18T10:15:00Z"
  },
  {
    id: "contribution-002",
    member: "Nomsa Dlamini",
    amount: 1000,
    method: "cash",
    status: "pending_confirmation",
    createdAt: "2025-06-17T14:02:00Z"
  },
  {
    id: "contribution-003",
    member: "Sipho Khumalo",
    amount: 2500,
    method: "cash",
    status: "pending_confirmation",
    createdAt: "2025-06-17T13:40:00Z"
  },
  {
    id: "contribution-004",
    member: "Zanele Nkosi",
    amount: 1000,
    method: "cash",
    status: "pending_confirmation",
    createdAt: "2025-06-16T11:25:00Z"
  },
  {
    id: "contribution-005",
    member: "Ayanda Ndlovu",
    amount: 3500,
    method: "digital",
    status: "outstanding",
    dueAt: "2025-06-25T00:00:00Z"
  }
];

const transactions = [
  {
    id: "transaction-89241",
    reference: "THM-89241",
    description: "Monthly contribution",
    member: "Nokuthula Maseko",
    type: "contribution",
    status: "verified",
    amount: 2500,
    currency: "ZAR",
    createdAt: "2025-06-18T10:15:00Z"
  },
  {
    id: "transaction-89237",
    reference: "THM-89237",
    description: "Cash contribution",
    member: "Nomsa Dlamini",
    type: "contribution",
    status: "awaiting_confirmation",
    amount: 1000,
    currency: "ZAR",
    createdAt: "2025-06-17T14:02:00Z"
  },
  {
    id: "transaction-89210",
    reference: "THM-89210",
    description: "Community hall deposit",
    member: "Thabo Khumalo",
    type: "withdrawal",
    status: "pending_approval",
    amount: -12500,
    currency: "ZAR",
    createdAt: "2025-06-18T09:42:00Z"
  },
  {
    id: "transaction-89190",
    reference: "THM-89190",
    description: "Loan repayment",
    member: "Future Minds",
    type: "loan",
    status: "completed",
    amount: 1025,
    currency: "ZAR",
    createdAt: "2025-06-15T08:30:00Z"
  },
  {
    id: "transaction-89162",
    reference: "THM-89162",
    description: "Winter drive groceries",
    member: "Khula Savings Circle",
    type: "bill",
    status: "completed",
    amount: -600,
    currency: "ZAR",
    createdAt: "2025-06-14T12:20:00Z"
  }
];

const approvals = [
  {
    id: "approval-2041",
    reference: "KSC-2041",
    description: "Community hall venue deposit",
    purpose: "Deposit for the Khula Savings Circle annual community celebration.",
    requestedBy: "Thabo Khumalo",
    amount: 12500,
    currency: "ZAR",
    requiredApprovals: 2,
    approvalsReceived: 1,
    status: "pending",
    createdAt: "2025-06-18T09:42:00Z"
  },
  {
    id: "approval-2042",
    reference: "KSC-2042",
    description: "Emergency member loan",
    requestedBy: "Ayanda Ndlovu",
    amount: 5000,
    currency: "ZAR",
    requiredApprovals: 2,
    approvalsReceived: 0,
    status: "pending",
    createdAt: "2025-06-18T08:30:00Z"
  }
];

const platformOverview = {
  monitoredValue: 12800000,
  registeredUsers: 8429,
  activeStokvels: 684,
  securityAlerts: 3
};

module.exports = {
  approvals,
  contributions,
  platformOverview,
  transactions,
  treasurerOverview
};
