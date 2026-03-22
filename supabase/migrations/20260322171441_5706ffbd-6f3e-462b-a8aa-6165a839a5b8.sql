-- Clean "Cliente" from leads table (set to NULL so real names can be captured)
UPDATE leads SET name = NULL WHERE name = 'Cliente';

-- Clean "Cliente" from omnichat_conversations
UPDATE omnichat_conversations SET contact_name = NULL WHERE contact_name = 'Cliente';

-- Clean "Cliente" from crm_cards
UPDATE crm_cards SET cliente = 'A identificar' WHERE cliente = 'Cliente';

-- Clean "Visitante" from leads table
UPDATE leads SET name = NULL WHERE name = 'Visitante';

-- Clean "Visitante" from omnichat_conversations
UPDATE omnichat_conversations SET contact_name = NULL WHERE contact_name = 'Visitante';
