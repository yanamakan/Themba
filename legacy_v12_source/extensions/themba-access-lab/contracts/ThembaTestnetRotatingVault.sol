// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
/**
 * THEMBA -- TESTNET-ONLY PROTOTYPE. NOT AUDITED. DO NOT USE WITH REAL ASSETS.
 * Standalone design candidate: do not silently replace the existing Safe wallet.
 * Group membership and signer addresses must be independently verified BEFORE deployment.
 * This contract is not itself an ERC-4337 smart account; gas sponsorship requires a separate compatible account / relayer.
 */
interface IThembaTestToken {
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}
contract ThembaTestnetRotatingVault {
    IThembaTestToken public immutable token;
    uint256 public immutable rotationContribution;
    uint256 public immutable reserveContribution;
    address[] public members;
    mapping(address => bool) public isMember;
    mapping(address => bool) public isSigner;
    mapping(uint256 => mapping(address => bool)) public contributed;
    mapping(uint256 => uint256) public contributionCount;
    uint256 public cycle = 1;
    uint256 public rotationBalance;
    uint256 public reserveBalance;
    uint256 public nextRequestId = 1;
    uint256 private locked = 1;
    struct Request {uint256 cycle; address recipient; uint256 amount; uint64 deadline; uint8 approvals; bool executed; bool rejected;}
    mapping(uint256 => Request) public requests;
    mapping(uint256 => uint256) public currentRequestForCycle;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    event Contributed(uint256 indexed cycle, address indexed member, uint256 rotation, uint256 reserve);
    event PayoutRequested(uint256 indexed id, uint256 indexed cycle, address indexed recipient, uint256 amount, uint64 deadline);
    event PayoutApproved(uint256 indexed id, address indexed signer, uint8 approvals);
    event PayoutRejected(uint256 indexed id, address indexed signer);
    event PayoutExecuted(uint256 indexed id, address indexed recipient, uint256 amount);
    error Forbidden(); error Invalid(); error NotReady(); error TransferFailed();
    modifier memberOnly(){if(!isMember[msg.sender])revert Forbidden();_;}
    modifier guard(){if(locked != 1)revert Invalid();locked = 2;_;locked = 1;}
    constructor(address testToken, address[] memory memberAddresses, address[] memory signerAddresses,
                uint256 rotationPerMember, uint256 reservePerMember) {
        if(testToken==address(0)||memberAddresses.length<3||memberAddresses.length>100||signerAddresses.length<3||
            rotationPerMember==0||rotationPerMember>type(uint128).max||reservePerMember>type(uint128).max ||
            rotationPerMember>type(uint128).max-reservePerMember)revert Invalid();
        token=IThembaTestToken(testToken);rotationContribution=rotationPerMember;reserveContribution=reservePerMember;
        for(uint256 i=0;i<memberAddresses.length;i++){
            address m=memberAddresses[i];if(m==address(0)||isMember[m])revert Invalid();
            isMember[m]=true;members.push(m);
        }
        for(uint256 i=0;i<signerAddresses.length;i++){
            address s=signerAddresses[i];if(!isMember[s]||isSigner[s])revert Invalid();isSigner[s]=true;
        }
    }
    function memberCount() external view returns(uint256){return members.length;}
    function scheduledRecipient() public view returns(address){return members[(cycle-1)%members.length];}
    function eligibleNonrecipientSigners(address recipient) public view returns (uint256 count) {
        for(uint256 i=0;i<members.length;i++)if(isSigner[members[i]]&&members[i]!=recipient)count++;
    }
    function contribute() external memberOnly guard {
        if(contributed[cycle][msg.sender]||currentRequestForCycle[cycle]!=0)revert NotReady();
        uint256 total=rotationContribution+reserveContribution;
        uint256 beforeBal=token.balanceOf(address(this));
        if(!token.transferFrom(msg.sender,address(this),total))revert TransferFailed();
        if(token.balanceOf(address(this))-beforeBal != total)revert TransferFailed();
        contributed[cycle][msg.sender]=true; contributionCount[cycle]++;
        rotationBalance+=rotationContribution;reserveBalance+=reserveContribution;
        emit Contributed(cycle,msg.sender,rotationContribution,reserveContribution);
    }
    function requestPayout(uint64 deadline) external memberOnly returns(uint256 id){
        if(msg.sender!=scheduledRecipient()||deadline<=block.timestamp+60||deadline>block.timestamp+30 days||
           contributionCount[cycle]!=members.length||eligibleNonrecipientSigners(msg.sender)<2||
           currentRequestForCycle[cycle]!=0)revert NotReady();
        uint256 amount=rotationContribution*members.length;
        if(rotationBalance<amount)revert NotReady();
        id=nextRequestId++;currentRequestForCycle[cycle]=id;
        requests[id]=Request(cycle,msg.sender,amount,deadline,0,false,false);
        emit PayoutRequested(id,cycle,msg.sender,amount,deadline);
    }
    function approve(uint256 id) external {
        Request storage p=requests[id];
        if(!isSigner[msg.sender]||p.recipient==msg.sender)revert Forbidden();
        if(p.recipient==address(0)||p.executed||p.rejected||p.cycle!=cycle||block.timestamp>p.deadline||
           hasVoted[id][msg.sender]||p.approvals>=2)revert NotReady();
        hasVoted[id][msg.sender]=true;p.approvals++;
        emit PayoutApproved(id,msg.sender,p.approvals);
    }
    function reject(uint256 id) external {
        Request storage p=requests[id];
        if(!isSigner[msg.sender]||p.recipient==msg.sender)revert Forbidden();
        if(p.recipient==address(0)||p.executed||p.rejected||p.cycle!=cycle||hasVoted[id][msg.sender])revert NotReady();
        hasVoted[id][msg.sender]=true;p.rejected=true;currentRequestForCycle[cycle]=0;
        emit PayoutRejected(id,msg.sender);
    }
    function cancelExpired(uint256 id) external memberOnly {
        Request storage p=requests[id];
        if(p.recipient==address(0)||p.executed||p.rejected||p.cycle!=cycle||block.timestamp<=p.deadline)revert NotReady();
        p.rejected=true;currentRequestForCycle[cycle]=0;
    }
    function execute(uint256 id) external memberOnly guard {
        Request storage p=requests[id];
        if(p.recipient==address(0)||p.executed||p.rejected||p.cycle!=cycle||
            p.approvals!=2||block.timestamp>p.deadline||rotationBalance<p.amount)revert NotReady();
        // Effects before external token call. Any transfer error reverts all state changes.
        p.executed=true;rotationBalance-=p.amount;cycle++;
        if(!token.transfer(p.recipient,p.amount))revert TransferFailed();
        emit PayoutExecuted(id,p.recipient,p.amount);
    }
    // Protection reserve is deliberately LOCKED; no administrator can silently withdraw it.
    // Reserve release/reimbursement requires a separately reviewed, approved design.
}
