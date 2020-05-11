pragma solidity >=0.4.21;

// Kyama Access Control contract
import "../Kyama Access Control/AccessControl.sol";
// Kyama M-Bill
import "./MBill.sol";
// Kyama Base contract
import "../Kyama Base/Base.sol";

// OpenZeppelin's SafeMath library
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/// @title Contract that handles Kyama's external account operations and statistical evaluaitons - both main and user accounts
/// @dev Kyama-Project

contract Accounts is AccessControl {
    // Base contract reference
    Base public base;
    // MBill contract reference
    MBill public mBill;
    // MBill payable contract address
    address payable mBillPayableAddress;

    // Event called when revenue is withdrawn
    event RevenueWithdrawal(address _withdrawingAddress, uint256 _withdrawalAmount);

    // Constructor to set initial values
    constructor(address _baseAddress, address _mBillAddress) public {
        // Initialize contracts
        base = Base(_baseAddress);
        mBillPayableAddress = address(uint160(_mBillAddress));
        mBill = MBill(mBillPayableAddress);
    }

    // Check if account has met investment consensus
    function isAccountHarmonized() external view returns (bool) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);

        return base.isAccountHarmonized(msg.sender, accShareCapital);
    }

    // Get an account's investment date
    function getInvestmentDate() external view returns (uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        return base.getInvestmentDate(msg.sender);
    }

    // Get an account's initial investment
    function initialInvestment() external view returns (uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        // Get initial acount investment
        uint256 accInitInvestment = base.getInitialInvestment(msg.sender);

        return accInitInvestment;
    }

    // Get an account's share capital
    function accountShareCap() external view returns (uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);

        return accShareCapital;
    }

    // Function to get an account's total M-Bill value
    function totalMVal() external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);

        // Get total account value
        uint256 totalAccVal = base.getTotalMVal(accShareCapital);

        return totalAccVal;
    }

    // Function to get corresponding share capital Ether value
    function shareCapVal(uint256 _shareCap) external view returns (uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        // Get corresponding Ether value
        uint256 etherVal = base.getTotalMVal(_shareCap);

        return etherVal;
    }

    // Functon to get an account's maximum M-Bill withdrawable amount
    function maxMWithdrawable() external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);

        // Get account maximum withdrawable amount
        uint256 maxWithdrawable = base.getTotalMWithdrawable(accShareCapital);

        return maxWithdrawable;
    }

    // Function to get an account's maximum debenture request amount
    function maxMLendable() external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);

        // Get account maximum debenture amount
        uint256 maxDebenture = base.getTotalDebenture(accShareCapital);

        return maxDebenture;
    }

    // Function to get an account's total debentures - both outstanding and resolved
    function totalDebentures() external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        return base.totalDebentures(msg.sender);
    }

    // Function to get an account's total MTxs
    function totalTransactions() external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        return base.totalMBillTxs(msg.sender);
    }

    // Function to get an MTx
    function transaction(uint256 _MTxIndex) external view returns(uint256, uint256, address, uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        return base.retrieveMTx(msg.sender, _MTxIndex);
    }

    // Function to get an account't outstanding debentures
    function outstandingDebentures() external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        return base.outstandingMDebentures(msg.sender);
    }

    // Function to get the amount expected from a particular debenture
    function retrieveDebenture(uint256 _debentureIndex) external view returns(uint256, uint256, uint256, uint256, uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        return base.retrieveDebenture(msg.sender, _debentureIndex);
    }

    // Function to get the account total interest
    function accountTotalInterest() external returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);

        return base.accountTotalInterest(msg.sender, accShareCapital);
    }

    // Function to get the account total debenture
    function accountTotalDebenture() external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        return base.accountTotalDebenture(msg.sender);
    }

    // Function to get the account total withdrawal
    function accountTotalWithdrawal() external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        return base.accountTotalWithdrawal(msg.sender);
    }

    // Function to get withdrawal cost
    function getWithdrawalCost(uint256 _withdrawalAmount) external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);

        return base.getWithdrawalCost(accShareCapital, _withdrawalAmount);
    }

    // Function to get debenture cost
    function getDebentureCost(uint256 _debentureAmount) external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);

        return base.getDebentureCost(accShareCapital, _debentureAmount);
    }

    // Function to get the account total transfer
    function accountTotalTransfer() external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        return base.accountTotalTransfer(msg.sender);
    }

    // Function to get the account total deposit
    function accountTotalDeposit() external view returns(uint256) {
        require(base.isUserRegistered(msg.sender) == true, "Address provided is not linked to a Kyama account.");

        return base.accountTotalDeposit(msg.sender);
    }

    // Function for the Kyama team to withdraw revenue
    function withdrawRevenue(uint256 _withdrawalAmount) external requireIsOperational requireIsCFO {
        require(_withdrawalAmount > 0, "Withdrawal amount provided is invalid.");
        require(_withdrawalAmount < base.revenue(), "Withdrawal amount above quota.");

        // Send corresponding ether amount to the CFO
        address payable CFO_PayableAddress = address(uint160(msg.sender));
        mBill.issueEther(CFO_PayableAddress, _withdrawalAmount);

        // Emit the revenue withdrawal
        emit RevenueWithdrawal(msg.sender, _withdrawalAmount);
    }
}