pragma solidity >=0.4.21;

// Kyama Access Control contract
import "../Kyama Access Control/AccessControl.sol";
// Kyama Base contract
import "../Kyama Base/Base.sol";
//Kyama M-Bill
import "../Kyama Treasury/MBill.sol";

// OpenZeppelin's SafeMath library
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/// @title Contract that handles an account's core functionality; deposits and withdrawals.
/// @dev Kyama-Project

contract MCore is AccessControl {
    // Base contract reference
    Base public base;
    // MBill contract reference
    MBill public mBill;
    // MBill payable contract address
    address payable mBillPayableAddress;

    using SafeMath for uint256;

    // Event emited when a deposit is made
    event Deposit(address _accountHolder, uint256 _depositAmount);
    // Event emited when a withdrawal is made
    event Withdrawal(address _accountHolder, uint256 _withdrawalAmount);

    // Constructor to set initial values
    constructor(address _baseAddress, address _mBillAddress) public {
        // Initialize contracts
        base = Base(_baseAddress);
        mBillPayableAddress = address(uint160(_mBillAddress));
        mBill = MBill(mBillPayableAddress);
    }

    // Function to handle the deposit of M-Bill tokens to an acount
    function deposit() public requireIsOperational payable {
        require(base.isUserRegistered(msg.sender) == true, "Address provided for deposit is not linked to a Kyama account.");

        // Store current pps
        uint256 depositPPS = base.currentMPPS();
        // Deposit amount
        uint256 depositAmount = msg.value;

        require(depositAmount > depositPPS, "Ether amount is too low for this transaction.");

        // Get the price-divisible amount deposited.
        // This technique prevents potential solidity floating point calculation errors.
        // However, this should not lead to any significant share capital buy in loss on the account holder.
        uint256 priceDivisibleDeposit = depositAmount - (depositAmount.mod(depositPPS));

        // Transfer funds to MBill contract
        mBillPayableAddress.transfer(msg.value);

        // Increment Kyama's total capital
        base.incrementTotalCapital(depositAmount);

        // Calculate deposit share capital
        uint256 shareCapital = priceDivisibleDeposit.div(depositPPS);

        // Increment total M-Bills issued
        base.incrementTotalMIssued(depositAmount);
        // Increment total M-Bill share capital
        base.incrementMShareCap(shareCapital);

        // Record M-Bill deposit
        base.recordMData(msg.sender, depositAmount, uint256(0), address(0), shareCapital);

        // Update the current M-Bill price per share
        base.updateMPPs();

        // Mint M-Bills for the account owner
        mBill.mintM_Bill(msg.sender, shareCapital);

        // Emit the deposit event
        emit Deposit(msg.sender, depositAmount);
    }

    // Function to handle withdrawal of M-Bill tokens from an account
    function withdraw(uint256 _withdrawalAmount) external requireIsOperational {
        require(base.isUserRegistered(msg.sender) == true, "Address provided for withdrawal is not linked to a Kyama account.");
        require(_withdrawalAmount > 0, "Withdrawal amount provided is invalid.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);

        // Get account max-withdrawable amount
        uint256 maxWithdrawable = base.getTotalMWithdrawable(accShareCapital);

        // Ensure that intended withdrawable amount is within acceptable range
        require(_withdrawalAmount <= maxWithdrawable, "Withdrawal amount provided is above account withdrawal quota.");

        // Get total account value
        uint256 totalAccVal = base.getTotalMVal(accShareCapital);
        // Get account M-Bill pPS
        uint256 acc_MPPS = totalAccVal.div(accShareCapital);

        // Ensure that intended withdrawable amount is above account pps
        require(_withdrawalAmount > acc_MPPS, "Withdrawal amount provided is below account withdrawal quota.");

        // Get withdrawal share capital
        uint256 withdrawalShareCap = _withdrawalAmount.div(acc_MPPS);

        // Get cost of withdrawal
        uint256 withdrawalCost = base.getWithdrawalCost(accShareCapital, _withdrawalAmount);
        // Get share capital equivalent to withdrawal cost
        uint256 withdrawalCostShareCap = withdrawalCost.div(acc_MPPS);

        // Burn account's tokens equivalent to the withdrawal amount
        mBill.burnM_Bill(msg.sender, withdrawalShareCap);
        // Burn account's tokens equivalent to the withdrawal cost
        mBill.burnM_Bill(msg.sender, withdrawalCostShareCap);

        // Decrement Kyama's total capital
        base.decrementTotalCapital(_withdrawalAmount);

        // Decrement total M-Bills issued
        base.decrementTotalMIssued(_withdrawalAmount);
        base.decrementTotalMIssued((withdrawalCost.mul(60)).div(100));
        // Decrement total M-Bill share capital
        base.decrementMShareCap(withdrawalShareCap);

        // Record M-Bill withdrawal
        base.recordMData(msg.sender, uint256(0), _withdrawalAmount, address(0), withdrawalShareCap);

        // Send corresponding ether amount to account holder
        address payable receiverPayableAddress = address(uint160(msg.sender));
        mBill.issueEther(receiverPayableAddress, _withdrawalAmount);

        // Emit the withdrawal event
        emit Withdrawal(msg.sender, _withdrawalAmount);
    }
}