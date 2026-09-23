import { CustomerProfile, ToolDefinition } from '../types';
import customersData from '../data/customers.json';

const customers: CustomerProfile[] = customersData as CustomerProfile[];

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_meter_reading',
    description: 'Tra cứu chỉ số công tơ điện gần nhất, chỉ số tháng trước và sản lượng điện tiêu thụ (kWh) của khách hàng EVN theo Mã khách hàng (dạng PE...).',
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'Mã khách hàng hợp đồng điện lực, ví dụ: PE01000123456, PE02000789012',
        },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'get_current_bill',
    description: 'Tra cứu chi tiết hóa đơn tiền điện kỳ gần nhất của khách hàng bao gồm sản lượng kWh, số tiền từng bậc thang 1-6, thuế VAT 8%, tổng số tiền và tình trạng thanh toán (Đã/Chưa thanh toán).',
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'Mã khách hàng EVN, ví dụ: PE01000123456',
        },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'get_payment_history',
    description: 'Tra cứu lịch sử giao dịch thanh toán tiền điện của khách hàng trong 6 tháng gần nhất qua các kênh ngân hàng, VNPAY, MoMo, App CSKH.',
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'Mã khách hàng EVN, ví dụ: PE01000123456',
        },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'check_maintenance_outage',
    description: 'Tra cứu lịch cắt điện kế hoạch, bảo trì sửa chữa nâng cấp lưới điện theo Mã khách hàng hoặc Mã trạm biến áp/Khu vực dân cư.',
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'Mã khách hàng EVN (nếu có), ví dụ: PE01000123456',
        },
        areaCode: {
          type: 'string',
          description: 'Mã khu vực hoặc quận/huyện, ví dụ: HK-TT-01, BT-TC-02',
        },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'estimate_current_bill',
    description: 'Ước tính tiền điện tạm tính cho khách hàng từ ngày ghi chỉ số gần nhất đến thời điểm hiện tại dựa trên biểu giá 6 bậc thang.',
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'Mã khách hàng EVN',
        },
        estimatedKwh: {
          type: 'number',
          description: 'Sản lượng điện ước tính (kWh)',
        },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'create_support_ticket',
    description: 'Tạo phiếu yêu cầu kiểm tra kỹ thuật / phúc tra chỉ số công tơ / xử lý sự cố gửi trực tiếp đến Đội điều độ và sửa chữa lưu động EVN.',
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'Mã khách hàng EVN',
        },
        issueType: {
          type: 'string',
          description: 'Loại sự cố',
          enum: ['Kiểm tra công tơ chạy nhanh', 'Báo mất điện đơn lẻ', 'Di dời công tơ', 'Khiếu nại tiền điện'],
        },
        description: {
          type: 'string',
          description: 'Nội dung chi tiết yêu cầu của khách hàng',
        },
      },
      required: ['customerId', 'issueType', 'description'],
    },
  },
];

// Helper to find customer by ID or loose matching
export function findCustomer(customerIdOrQuery: string): CustomerProfile | undefined {
  const clean = customerIdOrQuery.toUpperCase().trim();
  
  // Direct ID match
  const directMatch = customers.find(c => c.customerId === clean || clean.includes(c.customerId));
  if (directMatch) return directMatch;

  // Search by name or phone
  const byOther = customers.find(c => 
    clean.includes(c.phone) || 
    clean.includes(c.fullName.toUpperCase())
  );
  if (byOther) return byOther;

  // Default to first customer if placeholder or testing
  return customers[0];
}

// Tool Implementation Registry
export async function executeTool(
  toolName: string,
  params: Record<string, any>
): Promise<{ success: boolean; data: any; message: string }> {
  // Simulate network latency (80ms - 180ms)
  const delay = Math.floor(Math.random() * 100) + 80;
  await new Promise(resolve => setTimeout(resolve, delay));

  const customerId = params.customerId || 'PE01000123456';
  const customer = findCustomer(customerId);

  if (!customer) {
    return {
      success: false,
      data: null,
      message: `Không tìm thấy thông tin khách hàng với mã: ${customerId} trong cơ sở dữ liệu EVN.`,
    };
  }

  switch (toolName) {
    case 'get_meter_reading':
      return {
        success: true,
        data: {
          customerId: customer.customerId,
          fullName: customer.fullName,
          address: customer.address,
          meterReading: customer.meterReading,
        },
        message: `Đã lấy thành công chỉ số công tơ của khách hàng ${customer.fullName} (${customer.customerId}). Sản lượng tiêu thụ kỳ này: ${customer.meterReading.consumptionKwh} kWh.`,
      };

    case 'get_current_bill':
      return {
        success: true,
        data: {
          customerId: customer.customerId,
          fullName: customer.fullName,
          address: customer.address,
          transformerSubstation: customer.transformerSubstation,
          currentBill: customer.currentBill,
        },
        message: `Đã truy xuất hóa đơn tháng ${customer.currentBill.month} của ${customer.fullName}. Tổng tiền: ${customer.currentBill.totalAmount.toLocaleString('vi-VN')} VNĐ (${customer.currentBill.paymentStatus}).`,
      };

    case 'get_payment_history':
      return {
        success: true,
        data: {
          customerId: customer.customerId,
          fullName: customer.fullName,
          paymentHistory: customer.paymentHistory,
        },
        message: `Đã lấy ${customer.paymentHistory.length} kỳ giao dịch thanh toán tiền điện gần nhất của khách hàng ${customer.fullName}.`,
      };

    case 'check_maintenance_outage':
      return {
        success: true,
        data: {
          customerId: customer.customerId,
          fullName: customer.fullName,
          address: customer.address,
          transformerSubstation: customer.transformerSubstation,
          outageSchedule: customer.outageSchedule,
        },
        message: customer.outageSchedule.hasOutage
          ? `Phát hiện lịch cắt điện bảo trì tại ${customer.transformerSubstation}: Từ ${customer.outageSchedule.startTime} đến ${customer.outageSchedule.endTime} (${customer.outageSchedule.durationHours} tiếng liên tục).`
          : `Khu vực trạm ${customer.transformerSubstation} của khách hàng ${customer.fullName} hiện KHÔNG có lịch cắt điện bảo trì nào trong 7 ngày tới.`,
      };

    case 'estimate_current_bill': {
      const kwh = params.estimatedKwh || customer.meterReading.consumptionKwh || 200;
      // Calculate 6 tiers
      let subtotal = 0;
      const tiers = [
        { tier: 1, max: 50, price: 1893 },
        { tier: 2, max: 50, price: 1956 },
        { tier: 3, max: 100, price: 2271 },
        { tier: 4, max: 100, price: 2860 },
        { tier: 5, max: 100, price: 3197 },
        { tier: 6, max: Infinity, price: 3302 },
      ];
      let remaining = kwh;
      for (const t of tiers) {
        if (remaining <= 0) break;
        const used = Math.min(remaining, t.max);
        subtotal += used * t.price;
        remaining -= used;
      }
      const vat = Math.round(subtotal * 0.08);
      const total = subtotal + vat;

      return {
        success: true,
        data: {
          customerId: customer.customerId,
          estimatedKwh: kwh,
          subtotal,
          vatAmount: vat,
          estimatedTotalAmount: total,
        },
        message: `Ước tính tiền điện cho ${kwh} kWh là: ${total.toLocaleString('vi-VN')} VNĐ (gồm VAT 8%).`,
      };
    }

    case 'create_support_ticket': {
      const ticketId = `TK-EVN-${Date.now().toString().slice(-6)}`;
      return {
        success: true,
        data: {
          ticketId,
          customerId: customer.customerId,
          fullName: customer.fullName,
          issueType: params.issueType || 'Kiểm tra kỹ thuật',
          status: 'Đã tiếp nhận - Đang điều phối kỹ thuật viên',
          estimatedResolutionHours: 24,
          createdAt: new Date().toLocaleString('vi-VN'),
        },
        message: `Đã khởi tạo thành công phiếu yêu cầu ${ticketId}. Kỹ thuật viên EVN sẽ liên hệ khách hàng trong vòng 24 giờ.`,
      };
    }

    default:
      return {
        success: false,
        data: null,
        message: `Tool ${toolName} không tồn tại trong hệ thống.`,
      };
  }
}
