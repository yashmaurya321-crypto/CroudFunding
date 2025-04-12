import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import FundraiserABI from './abi.json'; // Your ABI JSON
import './App.css'; // We'll create this file next

const contractAddress = '0xB60a78201C7e1468Af145B076319421F362E4476';

function App() {
  const [funds, setFunds] = useState([]);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [contributionAmounts, setContributionAmounts] = useState({});
  const [isOwner, setIsOwner] = useState(false);
  const [account, setAccount] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state for creating a new fund
  const [newFund, setNewFund] = useState({
    title: '',
    brief: '',
    requireAmount: '',
    durationInMinutes: ''
  });

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, FundraiserABI, signer);
        const address = await signer.getAddress();
        
        setProvider(provider);
        setSigner(signer);
        setContract(contract);
        setAccount(address);
        
        // Check if connected wallet is the owner
        const ownerAddress = await contract.owner();
        setIsOwner(address.toLowerCase() === ownerAddress.toLowerCase());
        
        fetchFunds(contract);
        
        // Set up event listener for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          window.location.reload();
        });
      } else {
        alert('Please install MetaMask');
      }
    };

    init();
  }, []);

  const fetchFunds = async (contract) => {
    try {
      const allFunds = await contract.getAllFunds();
      // Format the data to match your UI needs
      const formattedFunds = allFunds.map(fund => ({
        id: Number(fund.id),
        title: fund.title,
        brief: fund.brief,
        requireAmount: fund.requireAmount,
        currentAmount: fund.currentAmount,
        completed: fund.completed,
        startTime: Number(fund.startTime) * 1000, // Convert to milliseconds
        endTime: Number(fund.endTime) * 1000,
        contributors: fund.contributors
      }));
      setFunds(formattedFunds);
    } catch (err) {
      console.error('Error fetching funds:', err);
    }
  };

  const handleAmountChange = (fundId, amount) => {
    setContributionAmounts({
      ...contributionAmounts,
      [fundId]: amount
    });
  };

  const contribute = async (fundId) => {
    const amount = contributionAmounts[fundId] || '0.01';
    try {
      const tx = await contract.contributeToFund(fundId, {
        value: ethers.parseEther(amount.toString()),
      });
      await tx.wait();
      alert('Contribution successful!');
      fetchFunds(contract); // Refresh funds after contribution
    } catch (error) {
      console.error('Contribution error:', error);
      alert(`Contribution failed: ${error.reason || error.message}`);
    }
  };

  const handleNewFundChange = (e) => {
    const { name, value } = e.target;
    setNewFund({
      ...newFund,
      [name]: value
    });
  };

  const createFund = async (e) => {
    e.preventDefault();
    try {
      // Convert amount to wei
      const amountInEther = parseFloat(newFund.requireAmount);
      const amountInWei = ethers.parseEther(amountInEther.toString());
      
      const tx = await contract.createCroudFund(
        newFund.title,
        newFund.brief,
        amountInWei,
        parseInt(newFund.durationInMinutes)
      );
      
      await tx.wait();
      alert('Fund created successfully!');
      
      // Reset form
      setNewFund({
        title: '',
        brief: '',
        requireAmount: '',
        durationInMinutes: ''
      });
      
      setShowCreateForm(false);
      fetchFunds(contract); // Refresh funds after creation
    } catch (error) {
      console.error('Error creating fund:', error);
      alert(`Failed to create fund: ${error.reason || error.message}`);
    }
  };

  // Improved helper function to format BigInt values with proper handling of small values
  const formatBigInt = (value) => {
    if (value === null || value === undefined) return '0';
    
    try {
      // Convert the value to a formatted string
      const formatted = ethers.formatEther(value.toString());
      
      // For very small values, use scientific notation
      const numValue = parseFloat(formatted);
      if (numValue > 0 && numValue < 0.0001) {
        return numValue.toExponential(6);
      }
      
      // For normal values, use fixed precision with 6 decimal places at most
      return numValue.toString();
    } catch (error) {
      console.error('Error formatting BigInt:', error);
      return '0';
    }
  };

  // Function to show progress bar for each fund
  const renderProgressBar = (current, target) => {
    const currentVal = parseFloat(ethers.formatEther(current.toString()));
    const targetVal = parseFloat(ethers.formatEther(target.toString()));
    const percentage = (currentVal / targetVal) * 100;
    const capped = Math.min(percentage, 100); // Cap at 100%
    
    return (
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${capped}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <h1 className="app-header">CrowdFunding Platform</h1>
      
      <div className="account-section">
        <p className="account-text">Connected Account: <span className="account-address">{account}</span></p>
        {isOwner && (
          <div>
            <p className="owner-tag">Contract Owner Access Granted</p>
            {!showCreateForm ? (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateForm(true)}
              >
                Create New Fund
              </button>
            ) : (
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
      
      {isOwner && showCreateForm && (
        <div className="form-container">
          <h2 className="form-header">Create New Fund</h2>
          <form onSubmit={createFund}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="title"
                value={newFund.title}
                onChange={handleNewFundChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="brief"
                value={newFund.brief}
                onChange={handleNewFundChange}
                required
              ></textarea>
            </div>
            
            <div className="form-group">
              <label>Target Amount (ETH)</label>
              <input
                type="number"
                name="requireAmount"
                value={newFund.requireAmount}
                onChange={handleNewFundChange}
                step="0.000001"
                min="0.000001"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                name="durationInMinutes"
                value={newFund.durationInMinutes}
                onChange={handleNewFundChange}
                min="1"
                required
              />
            </div>
            
            <button
              type="submit"
              className="btn btn-create"
            >
              Create Fund
            </button>
          </form>
        </div>
      )}
      
      <h2 className="section-header">Available Funds</h2>
      
      {funds.length === 0 ? (
        <p className="no-funds">No funds found.</p>
      ) : (
        <div className="funds-grid">
          {funds.map((fund) => (
            <div key={fund.id} className="fund-card">
              <h3 className="fund-title">{fund.title}</h3>
              <p className="fund-description">{fund.brief}</p>
              <div className="fund-details">
                <div className="progress-info">
                  <div className="progress-text">
                    <span>Progress:</span>
                    <span>{formatBigInt(fund.currentAmount)} / {formatBigInt(fund.requireAmount)} ETH</span>
                  </div>
                  {renderProgressBar(fund.currentAmount, fund.requireAmount)}
                </div>
                
                <p className="fund-status">
                  <strong>Status:</strong> 
                  <span className={fund.completed ? "status-completed" : "status-active"}>
                    {fund.completed ? 'Completed' : 'Active'}
                  </span>
                </p>
                <p className="fund-date"><strong>End Date:</strong> {new Date(fund.endTime).toLocaleDateString()}</p>
                <p className="fund-contributors"><strong>Contributors:</strong> {fund.contributors.length}</p>
              </div>
              {!fund.completed && (
                <div className="contribution-form">
                  <input
                    type="number"
                    className="contribution-input"
                    placeholder="Amount in ETH"
                    step="0.000001"
                    min="0.000001"
                    onChange={(e) => handleAmountChange(fund.id, e.target.value)}
                    value={contributionAmounts[fund.id] || ''}
                  />
                  <button 
                    className="btn btn-contribute"
                    onClick={() => contribute(fund.id)}
                  >
                    Contribute
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;