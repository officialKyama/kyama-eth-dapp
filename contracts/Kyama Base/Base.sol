pragma solidity >=0.4.21 <0.6.0;

/// @title Contract that contains main application data (storage)
/// @dev Kyama-Project

// OpenZeppelin's SafeMath library
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Base {
    using SafeMath for uint256;

    // Total capital within the main Kyama account
    uint256 public totalCapital;
    // Total M-Bills issued by Kyama
    uint256 public totalMIssued;
    // Total Kyama M-Bill share capital
    uint256 public totalMShareCapital;
    // Struct defining an m-Debenture. [Request for m-Bills based on your current stake (share cap)]
    struct mDebenture {
        uint256 requestDate;
        uint256 mValRequested;
        uint256 mValExpected;
        uint256 mValRepaid;
        uint256 shareCap;
    }
    // Array of all m-Debentures made on Kyama
    mDebenture[] public mDebentures;
    // Length of mDebenture array
    uint256 public mDebentureCount;

    // Individual account mTx (M-Bill transaction) data struct
    struct mTx {
        uint256 valIn; // Value being deposited
        uint256 valOut; // Value being withdrawn
        address coParty; // Other party in the transaction (address(0) if no coParty)
        uint256 shareCap; // If applicable ... a record of share capital as a result of transaction
    }

    // Array of all m-MetaData(s) present in Kyama
    mTx[] public mMetaData;

    // Struct defining an individual account
    struct account {
        address owner;
        uint256 totalDeposit;
        uint256 totalTransfer;
        uint256 investmentDate;
        uint256 initInvestment;
        int256 m_running_value;
        uint256 totalDebenture;
        uint256 totalWithdrawal;
        uint256 m_debentureCount;
        uint256[] mMetaDataIndexes;
        uint256[] mDebentureIndexes;

        /**
         * *highestMInterest is not an accurate indicator of the highest interest rate earned by an account
         * Therefore, it should only be used as an indicator metric but not as a source of truth
         */
        uint256 highestMInterest;
    }
    // Array of all accounts registered on Kyama
    account[] public accounts;
    // Length of the accounts array
    uint256 public accountsCount;
    // Mapping of registered accounts
    mapping (address => uint256) public registeredAccounts;

    // Mapping of addresses to their respective accounts
    // An address can only have 1 account!
    mapping (address => uint256) public accountIndexes;

    // Current M-Bill price per share
    uint256 public currentMPPS;
    // Current M-ppS increase index
    uint256 public currentMIndex;
    // Multiplier that determines average rate of increase of M-Bill ppS.
    // The 0-index refers to the numerator of the multiplier
    // The 1-index refers to the denominator of the multiplier
    uint256[] public ppsMultiplier;

    // Interest allocation multiplier that determines interest allocated to M-Bills and the Kyama Project
    // The 0-index corresponds to interest on M-Bills
    // The 1-index corresponds to profit to the Kyama Project
    // The 2-index corresponds to the interest division constant
    uint256[] public interestAllocation;
    // Withdrawal interest - interest rate
    // Interest rate charged on accrued interest on withdrawal
    uint256[] public withdrawalCharge;
    // Debenture interest - interest rate
    // Interest rate charged on accrued interest rate on debenture approval
    uint256[] public debentureCharge;
    // Debenture repayment interest
    uint256[] public debentureRepaymentI;
    // Maximum outstanding debentures
    uint256 public maxMDebentures;

    // Mapping of addresses that have call access to main application data
    mapping (address => bool) public callAccess;

    // Constructor function to set initial data values
    constructor() public {
        // Set initial M-Bill ppS
        currentMPPS = 10;

        // Initialize M-ppS increase index
        currentMIndex = 0;

        // Set ppS multiplier
        // The multiplier is 1.1, thus an average increase of 10%, and a representation of 11/10
        ppsMultiplier = [11, 10];

        // Set initial mDebentureCount to 0
        mDebentureCount = 0;

        // Set initial accountsCount to 0
        accountsCount = 0;

        // Set interest allocation multiplier
        // M-Bills interest allocation = 950/1000 = 95%
        // Kyama Project profit = 50/1000 = 5%
        interestAllocation = [950, 50, 1000];

        // Set withdrawal charge
        // = 80/100 = 80% as interest is 20% on accrued interest
        withdrawalCharge = [80, 100];

        // Set debenture charge
        // = 90/100 = 90% as interest rate is 10% on accrued interest
        debentureCharge = [90, 100];

        // Set debenture repayment interest
        // Interest of 10% represented as 110/100 ... growth of 1.1
        debentureRepaymentI = [110, 100];

        // Set maximum outstanding debentures
        maxMDebentures = 10;

        // Add deploying address to call access mapping
        callAccess[msg.sender] = true;
    }

    // Modifier to ensure that address is approved to call into application storage
    modifier isApproved() {
        require(callAccess[msg.sender] == true, "Storage access denied.");
        _;
    }

    // Function to approve address for call access
    function approveAddress(address _toApproveAddress) external isApproved {
        callAccess[_toApproveAddress] = true;
    }

    // Function to revoke address from call access
    function revokeAddress(address _toRevokeAddress) external isApproved {
        callAccess[_toRevokeAddress] = false;
    }

    // Function to create a new user account
    function createAccount(address _toCreateAddress, uint256 _investmentAmount) external isApproved {
        // Create new account struct
        account memory newAccount;
        newAccount.owner = _toCreateAddress;
        newAccount.investmentDate = block.timestamp;
        newAccount.initInvestment = _investmentAmount;
        newAccount.m_running_value = 0;
        newAccount.totalDebenture = 0;
        newAccount.totalWithdrawal = 0;
        newAccount.totalTransfer = 0;
        newAccount.totalDeposit = 0;
        newAccount.m_debentureCount = 0;
        newAccount.highestMInterest = 0;
        // Add new account to accounts directory
        accounts.push(newAccount);
        uint256 newAccountPosition = accounts.length.sub(1);

        // Update the accounts count
        accountsCount = accounts.length;

        // Formally register the account
        registeredAccounts[_toCreateAddress] = 1;
        // Record the account index
        accountIndexes[_toCreateAddress] = newAccountPosition;
    }

    // Function to retrieve registration status of an address
    function isUserRegistered(address _toCheckAddress) public view returns (bool) {
        require(_toCheckAddress != address(0), "The address provided for registration check must be valid.");

        bool isRegistered = false;
        uint256 registrationStatus = registeredAccounts[_toCheckAddress];
        if(registrationStatus == 1) {
            isRegistered = true;
        }

        return isRegistered;
    }

    // Function to get account investment date
    function getInvestmentDate(address _toCheckAddress) external isApproved view returns (uint256) {
        // Get account investment date
        uint256 investmentDate = accounts[accountIndexes[_toCheckAddress]].investmentDate;

        return investmentDate;
    }

    // Function to retrieve account initial investment
    function getInitialInvestment(address _toCheckAddress) external isApproved view returns (uint256) {
        // Get account initial investment
        uint256 initInvestment = accounts[accountIndexes[_toCheckAddress]].initInvestment;

        return initInvestment;
    }

    // Function to increment the total capital
    function incrementTotalCapital(uint256 _incrementAmount) external isApproved {
        totalCapital = totalCapital.add(_incrementAmount);
    }

    // Function to decrement the total capital
    function decrementTotalCapital(uint256 _decrementAmount) external isApproved {
        totalCapital = totalCapital.sub(_decrementAmount);
    }

    // Function to increment total M-Bills issued
    function incrementTotalMIssued(uint256 _incrementAmount) external isApproved {
        totalMIssued = totalMIssued.add(_incrementAmount);
    }

    // Function to decrement total M-Bills issued
    function decrementTotalMIssued(uint256 _decrementAmount) external isApproved {
        totalMIssued = totalMIssued.sub(_decrementAmount);
    }

    // Function to increment total M-Bill share capital
    function incrementMShareCap(uint256 _incrementAmount) external isApproved {
        totalMShareCapital = totalMShareCapital.add(_incrementAmount);
    }

    // Function to decrement total M-Bill share capital
    function decrementMShareCap(uint256 _decrementAmount) external isApproved {
        totalMShareCapital = totalMShareCapital.sub(_decrementAmount);
    }

    // Update M-Bill ppS in relation to multiplier
    function updateMPPs() external isApproved {
        if(currentMPPS <= currentMIndex) {
            currentMPPS = (currentMPPS.mul(ppsMultiplier[0])).div(ppsMultiplier[1]);
            currentMIndex = 0;
        } else {
            currentMIndex = currentMIndex.add(1);
        }
    }

    // Function to check if account has met investment consensus
    function isAccountHarmonized(address _accountAddress, uint256 _accShareCap) external view isApproved returns (bool) {
        uint256 accInitInvestment = accounts[accountIndexes[_accountAddress]].initInvestment;
        uint256 maxDebenture = getTotalDebenture(_accShareCap);
        uint256 totalDebenture = accounts[accountIndexes[_accountAddress]].totalDebenture;
        uint256 totalWithdrawal = accounts[accountIndexes[_accountAddress]].totalWithdrawal;
        uint256 totalTransfer = accounts[accountIndexes[_accountAddress]].totalTransfer;

        // Check for consensus
        bool isHarmonized = false;
        if(accInitInvestment < maxDebenture.add(totalDebenture).add(totalWithdrawal).add(totalTransfer)) {
            isHarmonized = true;
        }

        return isHarmonized;
    }

    // Function to record an M-Bill transaction to mMetaData
    function recordMData(address _accountAddress, uint256 _valIn, uint256 _valOut, address _coParty, uint256 _shareCap) external isApproved {
        require(isUserRegistered(_accountAddress) == true, "Address provided is not linked to a Kyama account.");
        require(_valIn >= 0, "Invalid deposit amount.");
        require(_valOut >= 0, "Invalid withdrawal amount.");
        require(_shareCap >= 0, "Invalid share capital amount");
        require(_coParty != _accountAddress, "Co-Party address provided is invalid.");

        // Create a new M-Bill transaction record
        mTx memory newMTx = mTx({
            valIn: _valIn,
            valOut: _valOut,
            coParty: _coParty,
            shareCap: _shareCap
        });
        mMetaData.push(newMTx);
        uint256 newMTxPosition = mMetaData.length.sub(1);

        // Update account counters
        if(_valIn > 0) {
            require(accounts[accountIndexes[_accountAddress]].m_running_value + int256(_valIn) >
             accounts[accountIndexes[_accountAddress]].m_running_value, "Running value _valIn error");
            accounts[accountIndexes[_accountAddress]].m_running_value += int256(_valIn);
            accounts[accountIndexes[_accountAddress]].totalDeposit = accounts[accountIndexes[_accountAddress]].totalDeposit.add(_valIn);
        }

        if(_valOut > 0) {
            require(accounts[accountIndexes[_accountAddress]].m_running_value - int256(_valOut) <
             accounts[accountIndexes[_accountAddress]].m_running_value, "Running value _valOut error");
            accounts[accountIndexes[_accountAddress]].m_running_value -= int256(_valOut);

            if(_coParty == address(0)) {
                accounts[accountIndexes[_accountAddress]].totalWithdrawal = accounts[accountIndexes[_accountAddress]].totalWithdrawal.add(_valOut);
            } else {
                accounts[accountIndexes[_accountAddress]].totalTransfer = accounts[accountIndexes[_accountAddress]].totalTransfer.add(_valOut);
            }
        }

        // Record transaction position to account
        accounts[accountIndexes[_accountAddress]].mMetaDataIndexes.push(newMTxPosition);
    }

    // Function to get account total MBill interest value
    function getMInterest(uint256 _accShareCap) internal isApproved view returns(uint256) {
        // Get total interest on the main Kyama account
        uint256 totalInterest = totalCapital.sub(totalMIssued);

        // Get total interest value on account M-Bills
        uint256 totalMInterestVal = (_accShareCap.mul(interestAllocation[0]).mul(totalInterest))
                                        .div((totalMShareCapital.mul(interestAllocation[2])));

        return totalMInterestVal;
    }

    // Function to get total Kyama revenue
    function revenue() public view returns(uint256) {
        // Get total interest on the main Kyama account
        uint256 totalInterest = totalCapital.sub(totalMIssued);

        // Get total revenue
        uint256 totalRevenue = (totalInterest.mul(interestAllocation[1]))
                                        .div(interestAllocation[2]);

        return totalRevenue;
    }

    // Function to get account total MBill raw value
    function getMRawVal(uint256 _accShareCap) internal isApproved view returns(uint256) {
        // Get total raw M-Bill value on account
        uint256 MRawVal = (_accShareCap.mul(totalMIssued)).div(totalMShareCapital);

        return MRawVal;
    }

    // Function to get account total M-Bill value
    function getTotalMVal(uint256 _accShareCap) public isApproved view returns(uint256) {
        // Get total raw M-Bill value on account
        uint256 totalMVal = getMRawVal(_accShareCap);
        // Get total interest value on account M-Bills
        uint256 totalMInterestVal = getMInterest(_accShareCap);

        // Total account value
        uint256 totalAccVal = totalMVal.add(totalMInterestVal);

        return totalAccVal;
    }

    // Function to get total M-Bill withdrawable value from acount
    function getTotalMWithdrawable(uint256 _accShareCap) external view isApproved returns(uint256) {
        // Get total raw M-Bill value on account
        uint256 totalMVal = getMRawVal(_accShareCap);
        // Get total interest value on account M-Bills
        uint256 totalMInterestVal = getMInterest(_accShareCap);

        // Get account withdrawable interest
        uint256 withdrawableInterest = ((totalMInterestVal).mul(withdrawalCharge[0])).div(withdrawalCharge[1]);
        // Get account maximum withdrawable amount
        uint256 maxWithdrawableAmount = (totalMVal).add(withdrawableInterest);

        return maxWithdrawableAmount;
    }

    // Function to get cost for account withdrawal
    function getWithdrawalCost(uint256 _accShareCap, uint256 _withdrawalAmount) external view isApproved returns(uint256) {
        // Get total raw M-Bill value on account
        uint256 totalMVal = getTotalMVal(_accShareCap);

        // Get ratio of withdrawal amount to total account value
        uint256 percWithdrawal = (_withdrawalAmount.div(totalMVal)).mul(100);
        if(percWithdrawal == uint256(0)) {
            percWithdrawal = 1;
        }

        // Get ratio of (100% - withdrawalCharge%) of total account interest to withdrawal amount
        // Get total interest value on account M-Bills
        uint256 totalMInterestVal = getMInterest(_accShareCap);
        // Get account withdrawable interest
        uint256 withdrawableInterest = ((totalMInterestVal).mul(withdrawalCharge[0])).div(withdrawalCharge[1]);
        // Get (100% - withdrawalCharge%) of total account interest
        uint256 remWithdrawableInterest = totalMInterestVal.sub(withdrawableInterest);

        // Get withdrawal cost
        uint256 withdrawalCost = percWithdrawal.mul(remWithdrawableInterest);

        return withdrawalCost;
    }

    // Function to get an account's maximum M-Bill debenture request amount
    function getTotalDebenture(uint256 _accShareCap) public view isApproved returns(uint256) {
        // Get total raw M-Bill value on account
        uint256 totalMVal = getMRawVal(_accShareCap);
        // Get total interest value on account M-Bills
        uint256 totalMInterestVal = getMInterest(_accShareCap);

        // Get account debenture interest
        uint256 debentureInterest = ((totalMInterestVal).mul(debentureCharge[0])).div(debentureCharge[1]);
        // Get account maximum debenture amount
        uint256 maxDebentureAmount = (totalMVal).add(debentureInterest);

        return maxDebentureAmount;
    }

    // Function to get cost for approved debenture request
    function getDebentureCost(uint256 _accShareCap, uint256 _debentureAmount) external view isApproved returns(uint256) {
        // Get total raw M-Bill value on account
        uint256 totalMVal = getTotalMVal(_accShareCap);

        // Get ratio of debenture amount to total account value
        uint256 percDebenture = (_debentureAmount.div(totalMVal)).mul(100);
        if(percDebenture == uint256(0)) {
            percDebenture = 1;
        }

        // Get ratio of (100% - debentureCharge%) of total account interest to debenture amount
        // Get total interest value on account M-Bills
        uint256 totalMInterestVal = getMInterest(_accShareCap);
        // Get account debenture interest
        uint256 debentureInterest = ((totalMInterestVal).mul(debentureCharge[0])).div(debentureCharge[1]);
        // Get (100% - debentureCharge%) of total account interest
        uint256 remDebentureInterest = totalMInterestVal.sub(debentureInterest);

        // Get debenture cost
        uint256 debentureCost = percDebenture.mul(remDebentureInterest);

        return debentureCost;
    }

    // Function to record M-Bill debenture tx
    function recordMDebenture(address _accountAddress, uint256 _valRequested, uint256 _shareCap) external isApproved {
        // Get the value expected
        uint256 valExpected = (_valRequested.mul(debentureRepaymentI[0])).div(debentureRepaymentI[1]);

        // Create a new M-Bill debenture tx
        mDebenture memory newMDebenture;
        newMDebenture.requestDate = block.timestamp;
        newMDebenture.mValRequested = _valRequested;
        newMDebenture.mValExpected = valExpected;
        newMDebenture.mValRepaid = uint256(0);
        newMDebenture.shareCap = _shareCap;

        // Record tx
        mDebentures.push(newMDebenture);
        uint256 newTxPosition = mDebentures.length.sub(1);

        // Update m_running_value
        require(accounts[accountIndexes[_accountAddress]].m_running_value - int256(_valRequested) <
         accounts[accountIndexes[_accountAddress]].m_running_value, "Running value _valRequested error");
        accounts[accountIndexes[_accountAddress]].m_running_value -= int256(_valRequested);

        // Update totalDebenture
        accounts[accountIndexes[_accountAddress]].totalDebenture = accounts[accountIndexes[_accountAddress]].totalDebenture.add(_valRequested);

        // Update mDebentureCount
        mDebentureCount = mDebentures.length;

        // Update account
        accounts[accountIndexes[_accountAddress]].mDebentureIndexes.push(newTxPosition);
        accounts[accountIndexes[_accountAddress]].m_debentureCount = accounts[accountIndexes[_accountAddress]].m_debentureCount.add(1);
    }

    // Functon to get the current number of M-Bill debentures outstanding in an account
    function outstandingMDebentures(address _accountAddress) public isApproved view returns(uint256) {
        uint256 outstandingDebentures = accounts[accountIndexes[_accountAddress]].m_debentureCount;

        if(outstandingDebentures > 30) {
            return uint256(0);
        } else {
            return outstandingDebentures;
        }
    }

    // Function to get the total number of debentures in an account (both outstanding and resolved)
    function totalDebentures(address _accountAddress) external isApproved view returns(uint256) {
        return accounts[accountIndexes[_accountAddress]].mDebentureIndexes.length;
    }

    // Function to get a particular debenture
    function retrieveDebenture(address _accountAddress, uint256 _debentureIndex) external isApproved view
        returns(uint256, uint256, uint256, uint256, uint256) {

        // Get debenture
        mDebenture memory xDebenture = mDebentures[accounts[accountIndexes[_accountAddress]].mDebentureIndexes[_debentureIndex]];
        uint256 mRequestDate = xDebenture.requestDate;
        uint256 mRequested = xDebenture.mValRequested;
        uint256 mExpected = xDebenture.mValExpected;
        uint256 mRepaid = xDebenture.mValRepaid;
        uint256 mShareCap = xDebenture.shareCap;

        return (mRequestDate, mRequested, mExpected, mRepaid, mShareCap);
    }

    // Function to get total number of mData transactions in an account
    function totalMBillTxs(address _accountAddress) external isApproved view returns(uint256) {
        return accounts[accountIndexes[_accountAddress]].mMetaDataIndexes.length;
    }

    // Function to get a particular MBill transaction
    function retrieveMTx(address _accountAddress, uint256 _TxIndex) external isApproved view
        returns(uint256, uint256, address, uint256) {

            // Get Tx
            mTx memory xMTx = mMetaData[accounts[accountIndexes[_accountAddress]].mMetaDataIndexes[_TxIndex]];
            uint256 valIn = xMTx.valIn;
            uint256 valOut = xMTx.valOut;
            address coParty = xMTx.coParty;
            uint256 shareCap = xMTx.shareCap;

            return (valIn, valOut, coParty, shareCap);
        }

    // Function to get immediate payable debenture
    function getImmediateDebenture(address _accountAddress) internal isApproved view returns(int256) {
        // Find M-Bill debenture next in line to be cleared
        uint256 pendingMDebentures = outstandingMDebentures(_accountAddress);
        // Find total M-Bill debentures
        uint256 totalMDebentures = accounts[accountIndexes[_accountAddress]].mDebentureIndexes.length;

        if(pendingMDebentures == 0 || totalMDebentures == 0) {
            return int256(-1);
        } else {
            uint256 MDebentureIndex = accounts[accountIndexes[_accountAddress]].mDebentureIndexes[totalMDebentures.sub(pendingMDebentures)];
            return int256(MDebentureIndex);
        }
    }

    // Get an account's immediate payable debenture balance
    // This is the outstanding amount on the longest outstanding loan balance
    function immediatePayableM(address _accountAddress) external isApproved view returns(uint256) {
        // Find M-Bill debenture next in line to be cleared
        int256 MDebentureIndex = getImmediateDebenture(_accountAddress);

        if(MDebentureIndex == int256(-1)) {
            return uint256(0);
        } else {
            mDebenture memory immediateMDebenture = mDebentures[uint256(MDebentureIndex)];

            // Get value expected to be repaid to clear M-Bill debenture
            uint256 mValExpected = immediateMDebenture.mValExpected;
            uint256 mValRepaid = immediateMDebenture.mValRepaid;
            uint256 debentureBalance = mValExpected.sub(mValRepaid);

            return debentureBalance;
        }
    }

    // Get an account's immediate payable share capital from M-Bill debenture
    function immediateMShareCap(address _accountAddress) external isApproved view returns(uint256) {
        // Find M-Bill debenture next in line to be cleared
        int256 MDebentureIndex = getImmediateDebenture(_accountAddress);

        if(MDebentureIndex == int256(-1)) {
            return uint256(0);
        } else {
            mDebenture memory immediateMDebenture = mDebentures[uint256(MDebentureIndex)];

            // Get share capital
            uint256 mShareCap = immediateMDebenture.shareCap;

            return mShareCap;
        }
    }

    // Pay off portion or entire outstanding balance of immediate M-Bill debenture
    function payImmediatePayableM(address _accountAddress, uint256 _payableValue) external isApproved {
        // Find M-Bill debenture next in line to be cleared
        int256 MDebentureIndex = getImmediateDebenture(_accountAddress);

        if(MDebentureIndex != int256(-1)) {
           mDebenture storage immediateMDebenture = mDebentures[uint256(MDebentureIndex)];

            // Update debenture value repayed
            uint256 mValRepaid = immediateMDebenture.mValRepaid;
            immediateMDebenture.mValRepaid = mValRepaid.add(_payableValue);

            // Update outstanding debenture count if necessary
            uint256 updatedMValRepaid = immediateMDebenture.mValRepaid;
            uint256 mValExpected = immediateMDebenture.mValExpected;
            if(updatedMValRepaid >= mValExpected) {
                accounts[accountIndexes[_accountAddress]].m_debentureCount = accounts[accountIndexes[_accountAddress]].m_debentureCount.sub(1);
            }

            // Update m_running_value
            require(accounts[accountIndexes[_accountAddress]].m_running_value + int256(_payableValue) >
             accounts[accountIndexes[_accountAddress]].m_running_value, "Running value _payableValue error");
            accounts[accountIndexes[_accountAddress]].m_running_value += int256(_payableValue);
        }
    }

    // Get account current interest value
    function accountCurrentInterest(address _accountAddress, uint256 _accShareCap) public view isApproved returns(uint256) {
        // Get account running value
        int256 accRunningVal = accounts[accountIndexes[_accountAddress]].m_running_value;
        uint256 currentAccountInterest = 0;

        if(accRunningVal > int256(0)) {
            uint256 runningVal = uint256(accRunningVal);
            uint256 totalMVal = getTotalMVal(_accShareCap);

            if(totalMVal > runningVal) {
                currentAccountInterest = totalMVal.sub(runningVal);
            }
        }

        return currentAccountInterest;
    }

    // Get account total interest value
    function accountTotalInterest(address _accountAddress, uint256 _accShareCap) public isApproved returns(uint256) {
        uint256 currentAccountInterest = accountCurrentInterest(_accountAddress, _accShareCap);

        uint256 accHighestInterest = accounts[accountIndexes[_accountAddress]].highestMInterest;
        if(accHighestInterest >= currentAccountInterest) {
            return accHighestInterest;
        } else {
            accounts[accountIndexes[_accountAddress]].highestMInterest = currentAccountInterest;
            return currentAccountInterest;
        }
    }

    // Get account total debenture
    function accountTotalDebenture(address _accountAddress) external view isApproved returns(uint256) {
        uint256 totalDebenture = accounts[accountIndexes[_accountAddress]].totalDebenture;

        if(totalDebenture > 0) {
            return totalDebenture;
        } else {
            return uint256(0);
        }
    }

    // Get account total withdrawal
    function accountTotalWithdrawal(address _accountAddress) external view isApproved returns(uint256) {
        uint256 totalWithdrawal = accounts[accountIndexes[_accountAddress]].totalWithdrawal;

        if(totalWithdrawal > 0) {
            return totalWithdrawal;
        } else {
            return uint256(0);
        }
    }

    // Get account total transfer
    function accountTotalTransfer(address _accountAddress) external view isApproved returns(uint256) {
        uint256 totalTransfer = accounts[accountIndexes[_accountAddress]].totalTransfer;

        if(totalTransfer > 0) {
            return totalTransfer;
        } else {
            return uint256(0);
        }
    }

    // Get account total deposit
    function accountTotalDeposit(address _accountAddress) external view isApproved returns(uint256) {
        uint256 totalDeposit = accounts[accountIndexes[_accountAddress]].totalDeposit - accounts[accountIndexes[_accountAddress]].initInvestment;

        if(totalDeposit > 0) {
            return totalDeposit;
        } else {
            return uint256(0);
        }
    }
}