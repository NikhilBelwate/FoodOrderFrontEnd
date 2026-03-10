import clsx from 'clsx';

const STATUS_STYLES = {
  Pending:   'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-blue-100   text-blue-800',
  Preparing: 'bg-purple-100 text-purple-800',
  Ready:     'bg-green-100  text-green-800',
  Delivered: 'bg-gray-100   text-gray-700',
  Cancelled: 'bg-red-100    text-red-700',
};

const STATUS_DOTS = {
  Pending:   'bg-yellow-400',
  Confirmed: 'bg-blue-400',
  Preparing: 'bg-purple-400',
  Ready:     'bg-green-400',
  Delivered: 'bg-gray-400',
  Cancelled: 'bg-red-400',
};

export default function OrderStatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700';
  const dot   = STATUS_DOTS[status]   || 'bg-gray-400';

  return (
    <span className={clsx('badge gap-1.5', style)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', dot)} />
      {status}
    </span>
  );
}
