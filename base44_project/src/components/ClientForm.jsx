import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const emptyForm = {
  name: "", type: "客户", contact: "", email: "", address: "",
  organization_code: "", bank_card_number: "", bank_card_expiry: "",
  credit_card_number: "", credit_card_expiry: "", remark: ""
};

export default function ClientForm({ open, onOpenChange, editItem, onSaved }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editItem) {
      setForm({
        name: editItem.name || "", type: editItem.type || "客户",
        contact: editItem.contact || "", email: editItem.email || "",
        address: editItem.address || "", organization_code: editItem.organization_code || "",
        bank_card_number: editItem.bank_card_number || "", bank_card_expiry: editItem.bank_card_expiry || "",
        credit_card_number: editItem.credit_card_number || "", credit_card_expiry: editItem.credit_card_expiry || "",
        remark: editItem.remark || ""
      });
    } else {
      setForm(emptyForm);
    }
  }, [editItem, open]);

  const handleSave = async () => {
    if (!form.name) { toast.error("名称为必填项"); return; }
    if (editItem) {
      await base44.entities.Client.update(editItem.id, form);
      toast.success("已更新");
    } else {
      await base44.entities.Client.create(form);
      toast.success("已创建");
    }
    onSaved();
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? "编辑(Edit)" : "新增(New)"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>名称(Name)*</Label>
              <Input value={form.name} onChange={e => f("name", e.target.value)} />
            </div>
            <div>
              <Label>类别(Type)</Label>
              <Select value={form.type} onValueChange={v => f("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="客户">客户</SelectItem>
                  <SelectItem value="供应商">供应商</SelectItem>
                  <SelectItem value="客户/供应商">客户/供应商</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>联系方式(Contact)</Label>
            <Input value={form.contact} onChange={e => f("contact", e.target.value)} />
          </div>
          <div>
            <Label>邮箱(Email)</Label>
            <Input value={form.email} onChange={e => f("email", e.target.value)} />
          </div>
          <div>
            <Label>银行卡号(Bank Card)</Label>
            <Input value={form.bank_card_number} onChange={e => f("bank_card_number", e.target.value)} />
          </div>
          <div>
            <Label>银行卡过期日期(Card Expiry)</Label>
            <Input type="date" value={form.bank_card_expiry} onChange={e => f("bank_card_expiry", e.target.value)} />
          </div>
          <div>
            <Label>信用卡号(Credit Card)</Label>
            <Input value={form.credit_card_number} onChange={e => f("credit_card_number", e.target.value)} />
          </div>
          <div>
            <Label>信用卡过期日期(Credit Card Expiry)</Label>
            <Input type="date" value={form.credit_card_expiry} onChange={e => f("credit_card_expiry", e.target.value)} />
          </div>
          <div>
            <Label>地址(Address)</Label>
            <Input value={form.address} onChange={e => f("address", e.target.value)} />
          </div>
          <div>
            <Label>备注(Remark)</Label>
            <Textarea value={form.remark} onChange={e => f("remark", e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
          <Button onClick={handleSave}>确认提交</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}