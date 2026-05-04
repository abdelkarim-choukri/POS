import { SimplTvaService } from './simpl-tva.service';

describe('SimplTvaService [TVA-041, TVA-042]', () => {
  let service: SimplTvaService;

  beforeEach(() => {
    service = new SimplTvaService();
  });

  describe('submitInvoice', () => {
    it('resolves without throwing', async () => {
      await expect(service.submitInvoice('txn-123')).resolves.not.toThrow();
    });

    it('returns stub status', async () => {
      const result = await service.submitInvoice('txn-123');
      expect(result.status).toBe('stub');
      expect(typeof result.message).toBe('string');
    });
  });

  describe('checkStatus', () => {
    it('resolves without throwing', async () => {
      await expect(service.checkStatus('txn-123')).resolves.not.toThrow();
    });

    it('returns stub status with null simpl_tva_status', async () => {
      const result = await service.checkStatus('txn-123');
      expect(result.status).toBe('stub');
      expect(result.simpl_tva_status).toBeNull();
    });
  });
});
