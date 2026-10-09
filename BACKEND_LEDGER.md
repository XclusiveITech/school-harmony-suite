# Backend: Ledger (GL, Journals, Cashbook, Bank Rec)

Django app `finance`, mounted at `/api/finance/`. The frontend client is
`src/lib/ledger-api.ts`.

## models.py

```python
from django.db import models
from .models import GLAccount, Receipt  # Receipt from finance models

JOURNAL_STATUS = [('Draft', 'Draft'), ('Posted', 'Posted'), ('Cancelled', 'Cancelled')]
CASHBOOK_TYPE = [('Receipt', 'Receipt'), ('Payment', 'Payment'), ('Transfer', 'Transfer')]
CASHBOOK_STATUS = [('Pending', 'Pending'), ('Processed', 'Processed')]

class JournalEntry(models.Model):
    date = models.DateField()
    reference = models.CharField(max_length=60)
    description = models.CharField(max_length=255)
    status = models.CharField(max_length=12, choices=JOURNAL_STATUS, default='Draft')
    source = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class JournalLine(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(GLAccount, on_delete=models.PROTECT)
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    memo = models.CharField(max_length=200, blank=True, null=True)

class CashbookEntry(models.Model):
    date = models.DateField()
    type = models.CharField(max_length=10, choices=CASHBOOK_TYPE)
    account = models.ForeignKey(GLAccount, on_delete=models.PROTECT, related_name='cashbook_entries')
    contra_account = models.ForeignKey(GLAccount, on_delete=models.PROTECT, related_name='cashbook_contra_entries', null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    method = models.CharField(max_length=30)
    reference = models.CharField(max_length=60, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=12, choices=CASHBOOK_STATUS, default='Pending')
    counterparty = models.CharField(max_length=100, blank=True, null=True)

class BankStatementLine(models.Model):
    date = models.DateField()
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=60, blank=True, null=True)
    matched_entry = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)
```

## serializers.py

```python
from rest_framework import serializers
from .models import JournalEntry, JournalLine, CashbookEntry, BankStatementLine, GLAccount

class JournalLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    class Meta:
        model = JournalLine
        fields = ['id', 'account', 'account_code', 'account_name', 'debit', 'credit', 'memo']

class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True)
    class Meta:
        model = JournalEntry
        fields = ['id', 'date', 'reference', 'description', 'status', 'source', 'lines']

    def validate(self, data):
        lines = data.get('lines', [])
        debits = sum(line.get('debit', 0) for line in lines)
        credits = sum(line.get('credit', 0) for line in lines)
        if debits != credits:
            raise serializers.ValidationError("Debits must equal credits.")
        return data

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        entry = JournalEntry.objects.create(**validated_data)
        for line_data in lines_data:
            JournalLine.objects.create(entry=entry, **line_data)
        return entry

class CashbookEntrySerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    contra_account_code = serializers.CharField(source='contra_account.code', read_only=True)
    contra_account_name = serializers.CharField(source='contra_account.name', read_only=True)
    class Meta:
        model = CashbookEntry
        fields = '__all__'

class BankStatementLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankStatementLine
        fields = '__all__'
```

## views.py

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import timedelta
from .models import JournalEntry, JournalLine, CashbookEntry, BankStatementLine
from .serializers import JournalEntrySerializer, CashbookEntrySerializer, BankStatementLineSerializer

class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer

    @action(detail=True, methods=['post'])
    def post(self, request, pk=None):
        entry = self.get_object()
        entry.status = 'Posted'
        entry.save()
        return Response({'status': 'posted'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        entry = self.get_object()
        entry.status = 'Cancelled'
        entry.save()
        return Response({'status': 'cancelled'})

class CashbookEntryViewSet(viewsets.ModelViewSet):
    queryset = CashbookEntry.objects.all()
    serializer_class = CashbookEntrySerializer

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        cb = self.get_object()
        # Create Journal Entry
        entry = JournalEntry.objects.create(
            date=cb.date,
            reference=cb.reference or f"CB-{cb.id}",
            description=cb.description or f"Cashbook {cb.type}",
            status='Posted',
            source=f'cashbook:{cb.id}'
        )
        if cb.type == 'Receipt':
            JournalLine.objects.create(entry=entry, account=cb.account, debit=cb.amount, credit=0)
            JournalLine.objects.create(entry=entry, account=cb.contra_account, debit=0, credit=cb.amount)
        elif cb.type == 'Payment':
            JournalLine.objects.create(entry=entry, account=cb.account, debit=0, credit=cb.amount)
            JournalLine.objects.create(entry=entry, account=cb.contra_account, debit=cb.amount, credit=0)
        
        cb.status = 'Processed'
        cb.save()
        return Response({'status': 'processed', 'journal_entry': entry.id})

class BankStatementLineViewSet(viewsets.ModelViewSet):
    queryset = BankStatementLine.objects.all()
    serializer_class = BankStatementLineSerializer

    @action(detail=False, methods=['post'])
    def auto_match(self, request):
        unmatched = BankStatementLine.objects.filter(matched_entry__isnull=True)
        count = 0
        for line in unmatched:
            # Match: equal amount, ±3 days
            match = JournalEntry.objects.filter(
                date__range=[line.date - timedelta(days=3), line.date + timedelta(days=3)],
                lines__debit=line.amount # Simplified logic
            ).first()
            if match:
                line.matched_entry = match
                line.save()
                count += 1
        return Response({'matched_count': count})
```

## urls.py

```python
router.register('journalentry', JournalEntryViewSet)
router.register('cashbookentry', CashbookEntryViewSet)
router.register('bankstatementline', BankStatementLineViewSet)
```

## MySQL DDL

```sql
CREATE TABLE finance_journalentry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    reference VARCHAR(60) NOT NULL,
    description VARCHAR(255) NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'Draft',
    source VARCHAR(50),
    created_at DATETIME(6) NOT NULL
);

CREATE TABLE finance_journalline (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entry_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    debit DECIMAL(12,2) NOT NULL DEFAULT 0,
    credit DECIMAL(12,2) NOT NULL DEFAULT 0,
    memo VARCHAR(200),
    CONSTRAINT fk_line_entry FOREIGN KEY (entry_id) REFERENCES finance_journalentry(id) ON DELETE CASCADE,
    CONSTRAINT fk_line_account FOREIGN KEY (account_id) REFERENCES finance_glaccount(id)
);

CREATE TABLE finance_cashbookentry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(10) NOT NULL,
    account_id BIGINT NOT NULL,
    contra_account_id BIGINT,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    method VARCHAR(30) NOT NULL,
    reference VARCHAR(60),
    description VARCHAR(255),
    status VARCHAR(12) NOT NULL DEFAULT 'Pending',
    counterparty VARCHAR(100),
    CONSTRAINT fk_cb_account FOREIGN KEY (account_id) REFERENCES finance_glaccount(id),
    CONSTRAINT fk_cb_contra FOREIGN KEY (contra_account_id) REFERENCES finance_glaccount(id)
);

CREATE TABLE finance_bankstatementline (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    reference VARCHAR(60),
    matched_entry_id BIGINT,
    CONSTRAINT fk_bsl_match FOREIGN KEY (matched_entry_id) REFERENCES finance_journalentry(id) ON DELETE SET NULL
);
```
