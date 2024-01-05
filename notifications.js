const notifications = {
  en: {
    otp_sms: `Your number {phone_number_of_agent} has been used to create an account on the XALISS, CID MONEY app. The verification code is {otp_code}. Welcome to the XALISS team.`,
    send_money: `You have received a transfer of {amount} from {sender_phone_number}. The reason is ({transfer_purpose}). Your new balance is {balance}.`,
    customer_create: `Welcome Mr. {customer_last_name} Your CID Money Account has been successfully created. You can manage your savings, access loans, create wallets, and much more. Contact your Financial Advisor {agent_full_name}, {agent_phone_number} for more information.`,
    contract_subscription: `Congratulations Mr. {customer_last_name}, you have just subscribed to savings with CID Money. The contract is: {type_of_saving}, starting {date_of_beginning}, and ending {date_of_end}, the amount is {amount}. The amount to be saved is {total_ammount_to_save_during_contract}. Thank you for your trust.`,
    saving_collection: `Hello Mr. {customer_last_name}. Savings of {amount_collected} Collected successfully, Balance: {account_balance}. Term: {number_of_collect_remaining}. Amount at Term: {total_ammount_saved_by_end_of_contract}. Appointment: {date_of_next_collect}.`,
  },
  fr: {
    otp_sms: `Votre numéro {phone_number_of_agent} a été utilisé pour créer un compte sur l'application XALISS, CID MONEY. Le code de vérification est {otp_code}. Bienvenue dans l'équipe XALISS.`,
    send_money: `Vous venez de recevoir un transfert de {amount} de la part de {sender_phone_number}. La raison est ({transfer_purpose}). Votre nouveau solde est {balance}.`,
    customer_create: `Bienvenue Monsieur {customer_last_name} Votre compte CID Money a été créé avec succès. Vous pouvez gérer vos épargnes, accéder à des prêts, créer des portefeuilles, et bien plus. Adressez-vous à votre conseiller financier {agent_full_name}, {agent_phone_number} pour plus d’informations.`,
    contract_subscription: `Félicitations Monsieur {customer_last_name}, vous venez de souscrire à une épargne avec CID Money. Le contrat est : {type_of_saving}, qui commence {date_of_beginning}, et qui prend fin {date_of_end}, le montant est {amount}. La somme à épargner est {total_ammount_to_save_during_contract}. Merci de votre confiance.`,
    saving_collection: `Bonjour Monsieur {customer_last_name}. Épargne de {amount_collected} Collecté avec succès, Solde : {account_balance}. Terme : {number_of_collect_remaining}. Montant à Terme : {total_ammount_saved_by_end_of_contract}. RDV : {date_of_next_collect}.`,
  },
};

Object.freeze(notifications);

module.exports = { notifications };
