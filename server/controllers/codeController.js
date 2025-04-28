import Code from '../models/Code.js';

// Function to mark a code as claimed and set status to 'inactive'
export const claimCode = async (req, res) => {
    try {
      const { code } = req.body; // Assuming you pass the code to be claimed
  
      // Find the code in the database
      const foundCode = await Code.findOne({ code });
  
      if (!foundCode) {
        return res.status(404).json({ message: 'Code not found' });
      }
  
      if (foundCode.status === 'inactive') {
        return res.status(400).json({ message: 'Code already claimed' });
      }
  
      // Update the status to 'inactive' once claimed
      foundCode.status = 'inactive';
      await foundCode.save();
  
      res.status(200).json({ message: 'Code claimed successfully', code: foundCode });
    } catch (error) {
      console.error('Error claiming code:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
