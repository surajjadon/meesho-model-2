// In Profile.jsx
const [isInviteModalOpen, setInviteModalOpen] = useState(false);

const myGSTs = [
  { id: 1, number: '27AABCU9603R1ZM', brandName: 'Brand Maharashtra', state: 'Maharashtra' },
  { id: 2, number: '07AABCU9603R1ZP', brandName: 'Brand Delhi', state: 'Delhi' }
];

return (
  <>
    {/* Your existing page content... */}
    <button onClick={() => setInviteModalOpen(true)}>+ Add Team Member</button>

    <InviteUserModal 
      isOpen={isInviteModalOpen} 
      onClose={() => setInviteModalOpen(false)} 
      gstList={myGSTs} 
    />
  </>
)