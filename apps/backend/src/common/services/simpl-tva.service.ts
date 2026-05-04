import { Injectable, Logger } from '@nestjs/common';

// TODO: integrate with DGI SIMPL-TVA API when available.
// Both methods are stubs that log the call and return a placeholder so that
// consumers can be wired up now and the live implementation dropped in later
// without any architectural changes ([TVA-042]).

@Injectable()
export class SimplTvaService {
  private readonly logger = new Logger(SimplTvaService.name);

  /**
   * [TVA-041] Format and submit a transaction to the SIMPL-TVA API.
   * Stub: logs the intent and returns a mock reference.
   */
  async submitInvoice(transactionId: string): Promise<{ status: 'stub'; message: string }> {
    this.logger.log(`[SIMPL-TVA stub] submitInvoice called for transaction ${transactionId}`);
    return { status: 'stub', message: `Invoice submission stubbed for transaction ${transactionId}` };
  }

  /**
   * [TVA-042] Check the SIMPL-TVA submission status for a transaction.
   * Stub: returns null status until the live API is integrated.
   */
  async checkStatus(transactionId: string): Promise<{ status: 'stub'; simpl_tva_status: null }> {
    this.logger.log(`[SIMPL-TVA stub] checkStatus called for transaction ${transactionId}`);
    return { status: 'stub', simpl_tva_status: null };
  }
}
